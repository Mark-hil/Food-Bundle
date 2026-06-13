import { ArrowLeft, Bell, Mail, MessageSquare, Save } from 'lucide-react';
import { useState } from 'react';
import { Link } from '../../lib/navigation';

export default function NotificationSettings() {
  const [settings, setSettings] = useState({
    orderUpdates: true,
    promotions: true,
    smsNotifications: true,
    emailNotifications: true,
    deliveryReminders: true,
    weeklyDigest: false
  });
  const [saved, setSaved] = useState(false);

  const handleToggle = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const notificationGroups = [
    {
      title: 'Order Notifications',
      description: 'Updates about your orders and deliveries',
      settings: [
        { key: 'orderUpdates', label: 'Order updates', icon: MessageSquare },
        { key: 'deliveryReminders', label: 'Delivery reminders', icon: Bell }
      ]
    },
    {
      title: 'Communication Preferences',
      description: 'How you want to receive notifications',
      settings: [
        { key: 'smsNotifications', label: 'SMS notifications', icon: MessageSquare },
        { key: 'emailNotifications', label: 'Email notifications', icon: Mail }
      ]
    },
    {
      title: 'Marketing & Promotions',
      description: 'News, offers, and special promotions',
      settings: [
        { key: 'promotions', label: 'Promotional offers', icon: Bell },
        { key: 'weeklyDigest', label: 'Weekly digest email', icon: Mail }
      ]
    }
  ];

  return (
    <div className="space-y-8">
      <Link to="/profile" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700">
        <ArrowLeft size={20} /> Back to Profile
      </Link>

      <div>
        <h1 className="text-4xl font-bold text-slate-900">Notification Settings</h1>
        <p className="text-slate-600 mt-2">Manage how you receive updates and notifications</p>
      </div>

      <div className="space-y-6">
        {notificationGroups.map((group, idx) => (
          <div key={idx} className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-2">{group.title}</h2>
            <p className="text-slate-600 mb-6">{group.description}</p>

            <div className="space-y-4">
              {group.settings.map(setting => (
                <label key={setting.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition cursor-pointer">
                  <div className="flex items-center gap-3">
                    <setting.icon size={20} className="text-blue-600" />
                    <span className="font-semibold text-slate-900">{setting.label}</span>
                  </div>
                  <div className={`w-12 h-6 rounded-full transition ${settings[setting.key as keyof typeof settings] ? 'bg-blue-600' : 'bg-slate-300'}`}>
                    <div className={`w-5 h-5 rounded-full bg-white m-0.5 transition ${settings[setting.key as keyof typeof settings] ? 'translate-x-6' : ''}`}></div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings[setting.key as keyof typeof settings]}
                    onChange={() => handleToggle(setting.key as keyof typeof settings)}
                    className="hidden"
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {saved && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <Bell size={18} /> Notification settings saved successfully!
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={handleSave}
          className="flex-1 bg-blue-600 text-white font-semibold py-3 rounded-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
        >
          <Save size={20} /> Save Preferences
        </button>
        <Link
          to="/profile"
          className="flex-1 bg-slate-100 text-slate-900 font-semibold py-3 rounded-lg hover:bg-slate-200 transition text-center"
        >
          Back
        </Link>
      </div>
    </div>
  );
}
