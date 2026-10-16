import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../modules/auth/state/authSlice';
 
export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
}); 
