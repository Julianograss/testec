export interface UserProfile { id: number; name: string; role: string; }
export const fetchUserData = async (): Promise<UserProfile> => new Promise(resolve => setTimeout(() => resolve({ id: 1, name: 'Weslley', role: 'Desenvolvedor Mobile' }), 1000));
