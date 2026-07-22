import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children, requireRole }) {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  let user = null;
  try {
    if (userStr) {
      user = JSON.parse(userStr);
    }
  } catch (error) {
    console.error('Failed to parse stored user:', error);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return <Navigate to="/login" replace />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireRole && user.role !== requireRole) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;
