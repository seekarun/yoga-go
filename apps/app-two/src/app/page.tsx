export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">App Two</h1>
        <p className="text-lg text-gray-600 mb-8">
          Welcome to App Two - a new application in the monorepo.
        </p>
        <div className="bg-white rounded-lg shadow-md p-6 max-w-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Getting Started
          </h2>
          <p className="text-gray-600">
            This is a placeholder page. Start building your app by editing{" "}
            <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">
              src/app/page.tsx
            </code>
          </p>
        </div>
      </div>
    </main>
  );
}
