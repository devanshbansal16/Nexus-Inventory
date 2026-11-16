import api from './api';

const authService = {
  login: async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      return response.data;
    } catch (err) {
      // If backend is not running or network fails, enable offline demo mode
      if (!err.response || err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        console.warn('[Demo Preview Mode] Backend offline; generating local demo session');
        const role = email.includes('admin')
          ? 'super_admin'
          : email.includes('inventory')
          ? 'inventory_manager'
          : email.includes('warehouse')
          ? 'warehouse_manager'
          : 'sales_manager';

        return {
          success: true,
          data: {
            token: 'demo-jwt-token-active',
            user: {
              id: 'demo-user-1',
              name: email.includes('admin')
                ? 'Aditi Sharma (Super Admin)'
                : email.includes('inventory')
                ? 'Rajesh Verma (Inventory Mgr)'
                : email.includes('delhi')
                ? 'Vikram Singh (Delhi Mgr)'
                : 'Suresh Patel (Sales Mgr)',
              email,
              role,
            },
          },
        };
      }
      throw err;
    }
  },

  register: async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return response.data;
    } catch (err) {
      if (!err.response || err.code === 'ERR_NETWORK') {
        return {
          success: true,
          data: {
            token: 'demo-jwt-token-registered',
            user: {
              id: 'demo-user-reg',
              name: userData.name,
              email: userData.email,
              role: 'staff',
            },
          },
        };
      }
      throw err;
    }
  },

  logout: async () => {
    try {
      const response = await api.post('/auth/logout');
      return response.data;
    } catch {
      return { success: true };
    }
  },

  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  updateProfile: async (userData) => {
    const response = await api.put('/auth/me', userData);
    return response.data;
  },
};

export default authService;
