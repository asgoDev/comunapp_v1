import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileService } from '../services/profileService';
import { useAuthStore } from '../stores/authStore';

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => profileService.getProfile().then((res) => res.data),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => profileService.updateProfile(data).then((res) => res.data),
    onSuccess: async () => {
      // Invalidar la consulta del perfil en react-query
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      
      // Actualizar los datos del usuario en la sesión global de Zustand de forma silenciosa
      try {
        const { checkAuth } = useAuthStore.getState();
        if (checkAuth) {
          await checkAuth({ silent: true });
        }
      } catch (err) {
        console.error('Error al actualizar el estado de autenticación:', err);
      }
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data) => profileService.changePassword(data).then((res) => res.data),
  });
}
