export interface Task {
  projectId: string
  taskId: string
  message: string
}

export interface TaskEvent {
  version: string
  id: string
  time: string
  detail: Task
}
