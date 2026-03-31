import api from './client';

export interface User {
  id: string;
  email: string;
  username: string;
  is_active: boolean;
  created_at: string;
}

export const authApi = {
  signup: (data: { email: string; username: string; password: string }) =>
    api.post<User>('/auth/signup', data),

  login: (data: { email: string; password: string }) =>
    api.post<User>('/auth/login', data),

  logout: () => api.post('/auth/logout'),

  refresh: () => api.post('/auth/refresh'),

  getMe: () => api.get<User>('/auth/me'),
};
