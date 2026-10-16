import { Sidebar } from '../dashboard/DashboardComponents';
import { getNavigationForRole } from '../../core/navigation/roleNavigation';

const RoleAwareNavigation = ({ role, items, ...sidebarProps }) => (
  <Sidebar items={items || getNavigationForRole(role)} {...sidebarProps} />
);

export default RoleAwareNavigation;
