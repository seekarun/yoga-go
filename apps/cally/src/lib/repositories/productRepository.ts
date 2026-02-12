/**
 * Product Repository for Cally - DynamoDB Operations
 *
 * Storage pattern:
 * - PK="TENANT#{tenantId}", SK="PRODUCT#{productId}"
 *
 * Queries:
 * - List all products: Query PK, SK begins_with "PRODUCT#"
 * - Get product by ID: GetItem PK + SK
 */

import {
  GetCommand,
  PutCommand,
  QueryCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, Tables, TenantPK, EntityType } from "../dynamodb";
import type { Product } from "@/types";
import { randomUUID } from "crypto";

/**
 * DynamoDB item type (includes PK/SK keys)
 */
interface DynamoDBProductItem extends Product {
  PK: string;
  SK: string;
  entityType: string;
}

/**
 * Strip DynamoDB keys from item to return clean Product
 */
function toProduct(item: DynamoDBProductItem): Product {
  const { PK: _PK, SK: _SK, entityType: _entityType, ...product } = item;
  return product;
}

/**
 * Input for creating a new product
 */
export interface CreateProductInput {
  name: string;
  description?: string;
  durationMinutes: number;
  price: number;
  color?: string;
  image?: string;
  imagePosition?: string;
  imageZoom?: number;
  isActive?: boolean;
  sortOrder?: number;
}

/**
 * Create a product for a tenant
 */
export async function createProduct(
  tenantId: string,
  input: CreateProductInput,
): Promise<Product> {
  const now = new Date().toISOString();
  const productId = randomUUID();

  console.log(
    `[DBG][productRepository] Creating product "${input.name}" for tenant ${tenantId}`,
  );

  const product: Product = {
    id: productId,
    name: input.name,
    description: input.description,
    durationMinutes: input.durationMinutes,
    price: input.price,
    color: input.color,
    image: input.image,
    imagePosition: input.imagePosition,
    imageZoom: input.imageZoom,
    isActive: input.isActive ?? true,
    sortOrder: input.sortOrder ?? 0,
    createdAt: now,
    updatedAt: now,
  };

  const item: DynamoDBProductItem = {
    PK: TenantPK.TENANT(tenantId),
    SK: TenantPK.PRODUCT(productId),
    entityType: EntityType.PRODUCT,
    ...product,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: item,
    }),
  );

  console.log(
    `[DBG][productRepository] Created product ${productId} for tenant ${tenantId}`,
  );
  return product;
}

/**
 * Get a product by ID for a tenant
 */
export async function getProductById(
  tenantId: string,
  productId: string,
): Promise<Product | null> {
  console.log(
    `[DBG][productRepository] Getting product ${productId} for tenant ${tenantId}`,
  );

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.PRODUCT(productId),
      },
    }),
  );

  if (!result.Item) {
    return null;
  }

  return toProduct(result.Item as DynamoDBProductItem);
}

/**
 * Get all products for a tenant, sorted by sortOrder
 */
export async function getProductsByTenant(
  tenantId: string,
): Promise<Product[]> {
  console.log(
    `[DBG][productRepository] Getting all products for tenant ${tenantId}`,
  );

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": TenantPK.TENANT(tenantId),
        ":skPrefix": TenantPK.PRODUCT_PREFIX,
      },
    }),
  );

  const products = (result.Items || []).map((item) =>
    toProduct(item as DynamoDBProductItem),
  );

  // Sort by sortOrder asc, then createdAt asc
  products.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  console.log(
    `[DBG][productRepository] Found ${products.length} products for tenant ${tenantId}`,
  );
  return products;
}

/**
 * Get active products for a tenant (for public display), sorted by sortOrder
 */
export async function getActiveProducts(tenantId: string): Promise<Product[]> {
  const products = await getProductsByTenant(tenantId);
  return products.filter((p) => p.isActive);
}

/**
 * Update a product (partial update via full-item replace)
 */
export async function updateProduct(
  tenantId: string,
  productId: string,
  updates: Partial<Omit<Product, "id" | "createdAt">>,
): Promise<Product | null> {
  console.log(
    `[DBG][productRepository] Updating product ${productId} for tenant ${tenantId}`,
  );

  const existing = await getProductById(tenantId, productId);
  if (!existing) {
    return null;
  }

  const updated: Product = {
    ...existing,
    ...updates,
    id: existing.id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };

  const item: DynamoDBProductItem = {
    PK: TenantPK.TENANT(tenantId),
    SK: TenantPK.PRODUCT(productId),
    entityType: EntityType.PRODUCT,
    ...updated,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: item,
    }),
  );

  console.log(
    `[DBG][productRepository] Updated product ${productId} for tenant ${tenantId}`,
  );
  return updated;
}

/**
 * Delete a product for a tenant
 */
export async function deleteProduct(
  tenantId: string,
  productId: string,
): Promise<void> {
  console.log(
    `[DBG][productRepository] Deleting product ${productId} for tenant ${tenantId}`,
  );

  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.PRODUCT(productId),
      },
    }),
  );

  console.log(
    `[DBG][productRepository] Deleted product ${productId} for tenant ${tenantId}`,
  );
}
