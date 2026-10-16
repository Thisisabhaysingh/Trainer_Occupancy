import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
const client = axios.create({ baseURL: apiBaseUrl, withCredentials: true });

export const getProjects = () => client.get('/api/projects').then((res) => res.data);
export const getProjectJobs = (projectId) => client.get(`/api/projects/${projectId}/jobs`).then((res) => res.data);
export const createProject = (payload) => client.post('/api/projects', payload).then((res) => res.data);
export const updateProject = (projectId, payload) => client.put(`/api/projects/${projectId}`, payload).then((res) => res.data);
export const deleteProject = (projectId) => client.delete(`/api/projects/${projectId}`).then((res) => res.data);

export const getJob = (jobId) => client.get(`/api/jobs/${jobId}`).then((res) => res.data);
export const getJobTasks = (jobId) => client.get(`/api/jobs/${jobId}/tasks`).then((res) => res.data);
export const createJob = (projectId, payload) => client.post(`/api/projects/${projectId}/jobs`, payload).then((res) => res.data);
export const updateJob = (jobId, payload) => client.put(`/api/jobs/${jobId}`, payload).then((res) => res.data);
export const deleteJob = (jobId) => client.delete(`/api/jobs/${jobId}`).then((res) => res.data);

export const getTask = (taskId) => client.get(`/api/tasks/${taskId}`).then((res) => res.data);
export const getAllTasks = (params = {}) => client.get('/api/tasks', { params }).then((res) => res.data);
export const createTask = (jobId, payload) => client.post(`/api/jobs/${jobId}/tasks`, payload).then((res) => res.data);
export const updateTask = (taskId, payload) => client.put(`/api/tasks/${taskId}`, payload).then((res) => res.data);
export const deleteTask = (taskId) => client.delete(`/api/tasks/${taskId}`).then((res) => res.data);

export const getTemplates = () => client.get('/api/templates').then((res) => res.data);
export const getTemplate = (templateId) => client.get(`/api/templates/${templateId}`).then((res) => res.data);
export const createTemplate = (payload) => client.post('/api/templates', payload).then((res) => res.data);
export const updateTemplate = (templateId, payload) => client.put(`/api/templates/${templateId}`, payload).then((res) => res.data);
export const deleteTemplate = (templateId) => client.delete(`/api/templates/${templateId}`).then((res) => res.data);

export const getEmployees = () => client.get('/api/employees').then((res) => res.data);
export const getBranches = () => client.get('/api/branches').then((res) => res.data);
