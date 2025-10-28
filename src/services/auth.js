export class AuthService {
  constructor() {
    this.storageKey = 'gerencial_fretes_user';
    this.usersKey = 'gerencial_fretes_users';
  }

  getCurrentUser() {
    const userJson = localStorage.getItem(this.storageKey);
    return userJson ? JSON.parse(userJson) : null;
  }

  getAllUsers() {
    const usersJson = localStorage.getItem(this.usersKey);
    return usersJson ? JSON.parse(usersJson) : [];
  }

  saveUsers(users) {
    localStorage.setItem(this.usersKey, JSON.stringify(users));
  }

  login(email, password) {
    const users = this.getAllUsers();
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
      const { password, ...userWithoutPassword } = user;
      localStorage.setItem(this.storageKey, JSON.stringify(userWithoutPassword));
      return { success: true, user: userWithoutPassword };
    }
    
    return { success: false, error: 'Email ou senha inválidos' };
  }

  register(userData, loginAfterRegister = true) {
    const users = this.getAllUsers();
    
    if (users.find(u => u.email === userData.email)) {
      return { success: false, error: 'Email já cadastrado' };
    }

    if (users.length === 0 && userData.perfil !== 'admin') {
      return { success: false, error: 'O primeiro usuário deve ser um Administrador' };
    }

    const newUser = {
      id: Date.now().toString(),
      ...userData,
      createdAt: new Date().toISOString(),
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      isPaid: false
    };

    users.push(newUser);
    this.saveUsers(users);

    const { password, ...userWithoutPassword } = newUser;
    
    if (loginAfterRegister) {
      localStorage.setItem(this.storageKey, JSON.stringify(userWithoutPassword));
    }
    
    return { success: true, user: userWithoutPassword };
  }

  logout() {
    localStorage.removeItem(this.storageKey);
  }

  updateUser(userId, updates) {
    const users = this.getAllUsers();
    const index = users.findIndex(u => u.id === userId);
    
    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      this.saveUsers(users);
      
      const currentUser = this.getCurrentUser();
      if (currentUser && currentUser.id === userId) {
        const { password, ...userWithoutPassword } = users[index];
        localStorage.setItem(this.storageKey, JSON.stringify(userWithoutPassword));
      }
      
      return { success: true };
    }
    
    return { success: false, error: 'Usuário não encontrado' };
  }
}
