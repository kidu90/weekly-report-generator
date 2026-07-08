import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { createProject, deleteProject, listProjects, updateProject } from '@/api/projects'
import { ProjectForm } from '@/components/forms/ProjectForm'
import { EmptyState } from '@/components/feedback/EmptyState'
import { PageSkeleton } from '@/components/feedback/PageSkeleton'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ProjectSummary } from '@/types/api'

type DialogState = { mode: 'create' } | { mode: 'edit'; project: ProjectSummary } | null

export function ProjectsPage() {
  const queryClient = useQueryClient()
  const [dialogState, setDialogState] = useState<DialogState>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProjectSummary | null>(null)

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: listProjects,
  })

  const orderedProjects = useMemo(
    () => (projectsQuery.data ?? []).slice().sort((left, right) => left.name.localeCompare(right.name)),
    [projectsQuery.data],
  )

  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      setDialogState(null)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateProject>[1] }) => updateProject(id, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      setDialogState(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteProject,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['projects'] })
      setDeleteTarget(null)
    },
  })

  if (projectsQuery.isLoading) {
    return <PageSkeleton />
  }

  const activeProject = dialogState?.mode === 'edit' ? dialogState.project : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-3xl border bg-card p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Manager</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Create, edit, and delete project records used by weekly reports.</p>
        </div>
        <Button className="gap-2" onClick={() => setDialogState({ mode: 'create' })}>
          <Plus className="h-4 w-4" />
          Add project
        </Button>
      </div>

      {projectsQuery.isError ? (
        <Card>
          <CardContent className="p-6 text-sm text-destructive">Unable to load projects right now.</CardContent>
        </Card>
      ) : orderedProjects.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Project directory</CardTitle>
            <CardDescription>Manage the project list that appears in report forms and dashboards.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orderedProjects.map((project) => (
                  <TableRow key={project._id}>
                    <TableCell className="font-medium">{project.name}</TableCell>
                    <TableCell className="max-w-xl text-sm text-muted-foreground">{project.description}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{project.members.length} member{project.members.length === 1 ? '' : 's'}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setDialogState({ mode: 'edit', project })}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setDeleteTarget(project)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          title="No projects yet"
          description="Add the first project so team members can assign work in their weekly reports."
          actionLabel="Add project"
          onAction={() => setDialogState({ mode: 'create' })}
        />
      )}

      <Dialog open={Boolean(dialogState)} onOpenChange={(open) => !open && setDialogState(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activeProject ? 'Edit project' : 'Add project'}</DialogTitle>
            <DialogDescription>Keep project data aligned with the reporting workflow.</DialogDescription>
          </DialogHeader>
          <ProjectForm
            project={activeProject}
            submitLabel={activeProject ? 'Save changes' : 'Create project'}
            isPending={createMutation.isPending || updateMutation.isPending}
            onSubmit={async (payload) => {
              if (activeProject) {
                await updateMutation.mutateAsync({ id: activeProject._id, payload })
                return
              }

              await createMutation.mutateAsync(payload)
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>
              This removes {deleteTarget?.name} from the project list. Existing reports keep their historical reference.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" disabled={deleteMutation.isPending} onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget._id)}>
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}