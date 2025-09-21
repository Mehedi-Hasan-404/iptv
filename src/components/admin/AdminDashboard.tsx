import CategoryManager from './CategoryManager';
import ChannelManager from './ChannelManager';

const AdminDashboard = () => (
  <div className="space-y-12">
    <section>
      <h2 className="text-3xl font-bold mb-6">Category Management</h2>
      <CategoryManager />
    </section>
    <div className="border-t border-gray-700" />
    <section>
      <h2 className="text-3xl font-bold mb-6">Channel Management</h2>
      <ChannelManager />
    </section>
  </div>
);
export default AdminDashboard;
