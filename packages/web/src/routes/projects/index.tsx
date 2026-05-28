import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Database, FileCode2, Loader2, Plus, Search, Trash2 } from "lucide-react";
import React, { useEffect, useState } from "react";
import { LogsViewer } from "@/components/logs/LogsViewer";
import { NewProjectModal } from "@/components/project";
import { useProjectStore } from "@/store/projectStore";

export const Route = createFileRoute("/projects/")({
  component: ProjectsPage,
});

const colorMap: Record<string, string> = {
  "#3b82f6": "bg-blue-500/10 text-blue-500",
  "#8b5cf6": "bg-purple-500/10 text-purple-500",
  "#10b981": "bg-emerald-500/10 text-emerald-500",
  "#f59e0b": "bg-amber-500/10 text-amber-500",
  "#ef4444": "bg-red-500/10 text-red-500",
};

function ProjectsPage() {
  const navigate = useNavigate();
  const {
    projects,
    isLoading,
    error,
    loadProjects,
    addProject,
    deleteProject,
    setCurrentProject,
    currentActionId,
  } = useProjectStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [showLogsViewer, setShowLogsViewer] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleNewProject = async (data: {
    name: string;
    description: string;
    stackType: "tanstackjs-nestjs" | "odata-ui5";
  }) => {
    setIsCreatingProject(true);
    try {
      const usedPorts = projects.map((p) => p.port).filter(Boolean);
      let availablePort = 4001;
      while (usedPorts.includes(availablePort)) {
        availablePort++;
      }

      const newProject = await addProject({
        name: data.name,
        description: data.description,
        icon: "📊",
        iconColor: "#3b82f6",
        stackType: data.stackType,
        port: availablePort,
      });

      setCurrentProject(newProject.id);
      navigate({ to: "/projects/$id/init", params: { id: newProject.id } });
    } catch (error) {
      console.error("Failed to create project:", error);
      throw error;
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await deleteProject(id);
      setShowDeleteConfirm(null);
      setShowMenu(null);
    } catch (error) {
      console.error("Failed to delete project:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete project";
      alert(`Error: ${errorMessage}`);
    }
  };

  const handleEditProject = (id: string) => {
    setCurrentProject(id);
    navigate({ to: "/projects/$id/init", params: { id } });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? "minute" : "minutes"} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 30) return `${diffDays} days ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-primary to-orange-600 p-2 rounded-lg">
                <Database className="w-6 h-6 text-white" />
              </div>
              <h1 className="font-bold text-2xl tracking-tight text-foreground">ERDwithAI</h1>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/admin/mermaid"
                className="flex items-center gap-2 px-4 py-2.5 bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground rounded-xl text-sm font-medium transition-colors"
              >
                <FileCode2 className="w-4 h-4" />
                Mermaid Library
              </Link>
              <Link
                to="/admin/rules"
                className="flex items-center gap-2 px-4 py-2.5 bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground rounded-xl text-sm font-medium transition-colors"
              >
                Rules Admin
              </Link>
            <button
              onClick={() => setShowNewProjectModal(true)}
              disabled={isLoading || isCreatingProject}
              className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-primary/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#FF8400" }}
            >
              {isLoading || isCreatingProject ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {isCreatingProject ? "Creating..." : "Create New Project"}
            </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-muted border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                placeholder="Search projects..."
                type="text"
              />
            </div>
            <select className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary">
              <option>All Status</option>
              <option>Active</option>
              <option>Draft</option>
              <option>Complete</option>
            </select>
            <select className="px-4 py-2.5 bg-background border border-border rounded-xl text-sm text-foreground focus:ring-2 focus:ring-primary/50 focus:border-primary">
              <option>All Types</option>
              <option>TanStack Start/NestJS</option>
              <option>OpenUI5/OData</option>
            </select>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto pb-12 px-4 pt-6">
        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Your Projects</h2>
        </div>

        {isLoading && projects.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-16 px-8 bg-card border border-border rounded-2xl">
            <Database className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-bold mb-2 text-foreground">No projects yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Create your first project and start building with AI-powered database design
            </p>
            <button
              onClick={() => setShowNewProjectModal(true)}
              disabled={isCreatingProject}
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-xl text-base font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: "#FF8400" }}
            >
              {isCreatingProject ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  Create Your First Project
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => {
              const colorClass = colorMap[project.iconColor] || colorMap["#3b82f6"];
              const isRunning = project.deploymentStatus === "running";

              const getStatusBadge = () => {
                if (isRunning) {
                  return {
                    text: "Active",
                    className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
                  };
                }
                if (project.generatedPath) {
                  return {
                    text: "Complete",
                    className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
                  };
                }
                return {
                  text: "Draft",
                  className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
                };
              };

              const statusBadge = getStatusBadge();

              return (
                <div
                  key={project.id}
                  className="bg-card border border-border rounded-xl p-5 relative group hover:border-primary/50 transition-all cursor-pointer"
                  style={{ borderColor: isRunning ? "#10b981" : undefined }}
                  onClick={() => {
                    setCurrentProject(project.id);
                    if (project.generatedPath) {
                      navigate({ to: "/projects/$id/enhance", params: { id: project.id } });
                    } else {
                      navigate({ to: "/projects/$id/init", params: { id: project.id } });
                    }
                  }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div
                      className={`w-12 h-12 ${colorClass} rounded-lg flex items-center justify-center text-2xl`}
                    >
                      {project.icon}
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wide border ${statusBadge.className}`}
                    >
                      {statusBadge.text}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold mb-2 text-foreground">{project.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[2.5rem]">
                    {project.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4 pb-4 border-b border-border">
                    <div className="flex items-center gap-1.5">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                      <span>{formatDate(project.updatedAt)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                        <polyline points="14,2 14,8 20,8" />
                      </svg>
                      <span>
                        {project.stackType === "tanstackjs-nestjs" ? "TanStack Start" : "OpenUI5"}
                      </span>
                    </div>
                  </div>

                  {isRunning && project.deploymentUrl && (
                    <div className="mb-3 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2">
                          <span className="relative flex h-full w-full">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <a
                            href={project.deploymentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-emerald-400 hover:text-emerald-300 truncate block"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {project.deploymentUrl}
                          </a>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {project.generatedPath ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate({ to: "/projects/$id/enhance", params: { id: project.id } });
                        }}
                        className="flex-1 px-3 py-2 text-sm font-semibold rounded-lg bg-primary hover:bg-primary/90 text-white transition-colors"
                        style={{ backgroundColor: "#FF8400" }}
                      >
                        Enhance
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditProject(project.id);
                        }}
                        className="flex-1 px-3 py-2 text-sm font-semibold rounded-lg bg-primary hover:bg-primary/90 text-white transition-colors"
                        style={{ backgroundColor: "#FF8400" }}
                      >
                        {project.deploymentStatus === "completed" ? "Edit" : "Continue"}
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(showMenu === project.id ? null : project.id);
                      }}
                      className="p-2 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {showMenu === project.id && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(null);
                        }}
                      />
                      <div className="absolute right-0 bottom-16 w-48 bg-card border border-border rounded-lg shadow-2xl z-50 overflow-hidden py-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(project.id);
                            setShowMenu(null);
                          }}
                          className="w-full px-4 py-2.5 text-sm flex items-center gap-3 hover:bg-red-500/10 text-red-500 transition-colors text-left"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete Project
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold mb-2">Delete Project?</h3>
            <p className="text-sm text-muted-foreground mb-6">
              This will mark the project for deletion. It will be removed from your dashboard but
              not permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 bg-muted hover:bg-muted/80 py-2.5 rounded-xl text-sm font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteProject(showDeleteConfirm)}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-bold transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logs Viewer Modal */}
      {showLogsViewer && (
        <LogsViewer
          actionId={currentActionId ?? undefined}
          onClose={() => setShowLogsViewer(false)}
          projectName={
            projects.find((p) => p.id === useProjectStore.getState().currentProject?.id)?.name
          }
        />
      )}

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        onCreateProject={handleNewProject}
        isLoading={isLoading}
      />
    </div>
  );
}
