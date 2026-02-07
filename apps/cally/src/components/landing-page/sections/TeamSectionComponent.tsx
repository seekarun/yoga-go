"use client";

import type { TeamSection, TeamMember } from "@/types/landing-page";
import type { SectionComponentProps } from "./types";

type TeamProps = SectionComponentProps<TeamSection>;

/**
 * Team Section Component
 *
 * Team member cards with photos, names, roles, and bios.
 */
export default function TeamSectionComponent({
  section,
  isEditing = false,
  onUpdate,
  onImageClick,
}: TeamProps) {
  const { heading, subheading, members } = section;

  const handleHeadingChange = (newHeading: string) => {
    onUpdate?.({ heading: newHeading });
  };

  const handleSubheadingChange = (newSubheading: string) => {
    onUpdate?.({ subheading: newSubheading });
  };

  const handleMemberChange = (
    id: string,
    field: keyof TeamMember,
    value: string,
  ) => {
    const updated = members.map((member) =>
      member.id === id ? { ...member, [field]: value } : member,
    );
    onUpdate?.({ members: updated });
  };

  const handleAddMember = () => {
    const newMember: TeamMember = {
      id: `member-${Date.now()}`,
      name: "Team Member",
      role: "Role",
      bio: "Add a short bio here.",
    };
    onUpdate?.({ members: [...members, newMember] });
  };

  const handleRemoveMember = (id: string) => {
    onUpdate?.({ members: members.filter((m) => m.id !== id) });
  };

  const sectionStyle: React.CSSProperties = {
    width: "100%",
    padding: "80px 8%",
    backgroundColor: "#ffffff",
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: "1200px",
    margin: "0 auto",
  };

  const headerStyle: React.CSSProperties = {
    textAlign: "center",
    marginBottom: "48px",
  };

  const headingStyle: React.CSSProperties = {
    fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
    fontWeight: 700,
    color: "#1a1a1a",
    marginBottom: "12px",
  };

  const subheadingStyle: React.CSSProperties = {
    fontSize: "1.1rem",
    color: "#6b7280",
    maxWidth: "600px",
    margin: "0 auto",
  };

  const gridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "32px",
  };

  const cardStyle: React.CSSProperties = {
    textAlign: "center",
    position: "relative",
  };

  const avatarContainerStyle: React.CSSProperties = {
    position: "relative",
    width: "180px",
    height: "180px",
    margin: "0 auto 20px",
    borderRadius: "50%",
    overflow: "hidden",
    backgroundColor: "#f3f4f6",
  };

  const avatarStyle = (src?: string): React.CSSProperties => ({
    width: "100%",
    height: "100%",
    backgroundImage: src ? `url(${src})` : undefined,
    backgroundPosition: "center",
    backgroundSize: "cover",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  });

  const nameStyle: React.CSSProperties = {
    fontSize: "1.25rem",
    fontWeight: 600,
    color: "#1a1a1a",
    marginBottom: "4px",
  };

  const roleStyle: React.CSSProperties = {
    fontSize: "1rem",
    color: "#2563eb",
    marginBottom: "12px",
  };

  const bioStyle: React.CSSProperties = {
    fontSize: "0.95rem",
    color: "#6b7280",
    lineHeight: 1.6,
  };

  const editableStyle: React.CSSProperties = isEditing
    ? {
        cursor: "text",
        outline: "none",
        borderRadius: "4px",
        padding: "4px 8px",
        transition: "background 0.2s, outline 0.2s",
      }
    : {};

  const addMemberStyle: React.CSSProperties = {
    textAlign: "center",
    padding: "40px",
    borderRadius: "12px",
    border: "2px dashed #e5e7eb",
    backgroundColor: "transparent",
    cursor: "pointer",
    transition: "border-color 0.2s, background 0.2s",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "280px",
  };

  return (
    <section style={sectionStyle}>
      {isEditing && (
        <style>{`
          .editable-field-dark:focus {
            background: rgba(0, 0, 0, 0.05) !important;
            outline: 2px solid rgba(0, 0, 0, 0.3) !important;
          }
          .editable-field-dark:hover:not(:focus) {
            background: rgba(0, 0, 0, 0.02);
          }
          .team-card:hover .delete-btn {
            opacity: 1;
          }
          .add-member-btn:hover {
            border-color: #9ca3af;
            background: rgba(0, 0, 0, 0.02);
          }
        `}</style>
      )}
      <div style={containerStyle}>
        {/* Header */}
        <div style={headerStyle}>
          {isEditing ? (
            <>
              <div
                className="editable-field-dark"
                contentEditable
                suppressContentEditableWarning
                style={{
                  ...headingStyle,
                  ...editableStyle,
                  display: "inline-block",
                }}
                onBlur={(e) =>
                  handleHeadingChange(e.currentTarget.textContent || "")
                }
              >
                {heading || "Meet the Team"}
              </div>
              <div
                className="editable-field-dark"
                contentEditable
                suppressContentEditableWarning
                style={{ ...subheadingStyle, ...editableStyle }}
                onBlur={(e) =>
                  handleSubheadingChange(e.currentTarget.textContent || "")
                }
              >
                {subheading || "The people behind the magic"}
              </div>
            </>
          ) : (
            <>
              <h2 style={headingStyle}>{heading || "Meet the Team"}</h2>
              <p style={subheadingStyle}>
                {subheading || "The people behind the magic"}
              </p>
            </>
          )}
        </div>

        {/* Team Grid */}
        <div style={gridStyle}>
          {members.map((member) => (
            <div key={member.id} className="team-card" style={cardStyle}>
              {isEditing && (
                <button
                  type="button"
                  className="delete-btn"
                  onClick={() => handleRemoveMember(member.id)}
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    width: "28px",
                    height: "28px",
                    backgroundColor: "#ef4444",
                    borderRadius: "50%",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: 0,
                    transition: "opacity 0.2s",
                    zIndex: 10,
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                  >
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              )}

              {/* Avatar */}
              <div style={avatarContainerStyle}>
                <div style={avatarStyle(member.image)}>
                  {!member.image && (
                    <svg
                      width="64"
                      height="64"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#9ca3af"
                      strokeWidth="1.5"
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  )}
                </div>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => onImageClick?.(`team-${member.id}`)}
                    style={{
                      position: "absolute",
                      bottom: "8px",
                      right: "8px",
                      width: "36px",
                      height: "36px",
                      backgroundColor: "white",
                      borderRadius: "50%",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    }}
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#374151"
                      strokeWidth="2"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Name */}
              {isEditing ? (
                <div
                  className="editable-field-dark"
                  contentEditable
                  suppressContentEditableWarning
                  style={{ ...nameStyle, ...editableStyle }}
                  onBlur={(e) =>
                    handleMemberChange(
                      member.id,
                      "name",
                      e.currentTarget.textContent || "",
                    )
                  }
                >
                  {member.name}
                </div>
              ) : (
                <h3 style={nameStyle}>{member.name}</h3>
              )}

              {/* Role */}
              {isEditing ? (
                <div
                  className="editable-field-dark"
                  contentEditable
                  suppressContentEditableWarning
                  style={{ ...roleStyle, ...editableStyle }}
                  onBlur={(e) =>
                    handleMemberChange(
                      member.id,
                      "role",
                      e.currentTarget.textContent || "",
                    )
                  }
                >
                  {member.role}
                </div>
              ) : (
                <p style={roleStyle}>{member.role}</p>
              )}

              {/* Bio */}
              {(member.bio || isEditing) &&
                (isEditing ? (
                  <div
                    className="editable-field-dark"
                    contentEditable
                    suppressContentEditableWarning
                    style={{ ...bioStyle, ...editableStyle }}
                    onBlur={(e) =>
                      handleMemberChange(
                        member.id,
                        "bio",
                        e.currentTarget.textContent || "",
                      )
                    }
                  >
                    {member.bio || "Add bio..."}
                  </div>
                ) : (
                  member.bio && <p style={bioStyle}>{member.bio}</p>
                ))}
            </div>
          ))}

          {/* Add Member Button */}
          {isEditing && members.length < 8 && (
            <button
              type="button"
              className="add-member-btn"
              style={addMemberStyle}
              onClick={handleAddMember}
            >
              <svg
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9ca3af"
                strokeWidth="1.5"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v8M8 12h8" />
              </svg>
              <span
                style={{
                  marginTop: "12px",
                  color: "#6b7280",
                  fontSize: "0.9rem",
                }}
              >
                Add Team Member
              </span>
            </button>
          )}
        </div>

        {/* Empty state */}
        {members.length === 0 && !isEditing && (
          <div
            style={{
              textAlign: "center",
              padding: "60px 20px",
              color: "#9ca3af",
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{ margin: "0 auto 16px" }}
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <p>No team members yet</p>
          </div>
        )}
      </div>
    </section>
  );
}
