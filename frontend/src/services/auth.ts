import api from './api';
import type { ApiResponse, User } from '../types';

export const authApi = {
  login(email: string, password: string) {
    return api.post<ApiResponse<{ token: string; user: User }>>('/auth/login', { email, password });
  },
  me() {
    return api.get<ApiResponse<User>>('/auth/me');
  },
  changePassword(currentPassword: string, newPassword: string) {
    return api.post<ApiResponse<{ message: string }>>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
  },
  forgotPassword(email: string, newPassword: string) {
    return api.post<ApiResponse<{ message: string }>>('/auth/forgot-password', {
      email,
      newPassword,
    });
  },
};
