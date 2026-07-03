import { useState, useEffect } from 'react';
import { Save, Building2, Truck, Percent } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function Settings() {
  const [settings, setSettings] = useState({
    siteName: 'FoodBundle',
    supportEmail: 'support@foodbundle.com',
    phone: '+1 (555) 123-4567',
    deliveryCharge: '15.00',
    minOrderValue: '20.00',
    businessHours: '9:00 AM - 6:00 PM',
    freeDeliveryThreshold: '700.00',
    subscriptionFoodDiscountPercent: '40',
    subscriptionDeliveryDiscountPercent: '20',
    loyaltyEarnStepAmount: '10.00',
    loyaltyEarnStepPoints: '10',
    loyaltyRedemptionRatio: '100',
    loyaltyMinPointsToRedeem: '500',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pushStatus, setPushStatus] = useState<'idle' | 'loading' | 'subscribed' | 'error'>('idle');

  // Utility to convert VAPID key to Uint8Array
  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const enablePushNotifications = async () => {
    try {
      setPushStatus('loading');
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Push notifications are not supported by your browser.');
      }

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied.');
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();
      
      const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!publicVapidKey) {
         throw new Error('VAPID Public Key is missing.');
      }

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
        });
      }

      // Save to Supabase
      const { error: dbError } = await supabase
        .from('admin_push_subscriptions')
        .insert([{ subscription: subscription.toJSON() }]);

      if (dbError) throw dbError;

      setPushStatus('subscribed');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error enabling push notifications:', err);
      setError(err.message || 'Failed to enable notifications');
      setPushStatus('error');
    }
  };

  const checkPushSubscription = async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          const subscription = await registration.pushManager.getSubscription();
          if (subscription) {
            setPushStatus('subscribed');
          }
        }
      } catch (err) {
        console.error("Error checking push subscription:", err);
      }
    }
  };

  useEffect(() => {
    fetchSettings();
    checkPushSubscription();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') throw error;
      } else if (data) {
        setSettings({
          siteName: data.site_name,
          supportEmail: data.support_email,
          phone: data.phone,
          deliveryCharge: Number(data.delivery_charge).toFixed(2),
          minOrderValue: Number(data.min_order_value).toFixed(2),
          businessHours: data.business_hours,
          freeDeliveryThreshold: Number(data.free_delivery_threshold || 700).toFixed(2),
          subscriptionFoodDiscountPercent: Number(data.subscription_food_discount_percent || 40).toString(),
          subscriptionDeliveryDiscountPercent: Number(data.subscription_delivery_discount_percent || 20).toString(),
          loyaltyEarnStepAmount: Number(data.loyalty_earn_step_amount || 10).toFixed(2),
          loyaltyEarnStepPoints: Number(data.loyalty_earn_step_points || 10).toString(),
          loyaltyRedemptionRatio: Number(data.loyalty_redemption_ratio || 100).toString(),
          loyaltyMinPointsToRedeem: Number(data.loyalty_min_points_to_redeem || 500).toString(),
        });
      }
    } catch (err: any) {
      console.error('Error fetching settings:', err);
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: value }));
    setSuccess(false);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('system_settings')
        .update({
          site_name: settings.siteName,
          support_email: settings.supportEmail,
          phone: settings.phone,
          delivery_charge: Number(settings.deliveryCharge),
          min_order_value: Number(settings.minOrderValue),
          business_hours: settings.businessHours,
          free_delivery_threshold: Number(settings.freeDeliveryThreshold),
          subscription_food_discount_percent: Number(settings.subscriptionFoodDiscountPercent),
          subscription_delivery_discount_percent: Number(settings.subscriptionDeliveryDiscountPercent),
          loyalty_earn_step_amount: Number(settings.loyaltyEarnStepAmount),
          loyalty_earn_step_points: Number(settings.loyaltyEarnStepPoints),
          loyalty_redemption_ratio: Number(settings.loyaltyRedemptionRatio),
          loyalty_min_points_to_redeem: Number(settings.loyaltyMinPointsToRedeem),
        })
        .eq('id', 1);

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 flex items-start gap-3 border border-red-200">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-green-700 flex items-start gap-3">
            <div className="w-5 h-5 flex-shrink-0 mt-0.5">
              <svg className="w-full h-full" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <span>Settings saved successfully!</span>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm p-8 border border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <div className="flex items-center mb-6">
                <Building2 className="w-5 h-5 text-green-600 mr-3" />
                <h2 className="text-lg font-semibold text-slate-900">Business Information</h2>
              </div>
              <div className="border-t border-slate-200 pt-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Site Name
                  </label>
                  <input
                    type="text"
                    name="siteName"
                    value={settings.siteName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Support Email
                  </label>
                  <input
                    type="email"
                    name="supportEmail"
                    value={settings.supportEmail}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={settings.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Business Hours
                  </label>
                  <input
                    type="text"
                    name="businessHours"
                    value={settings.businessHours}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    placeholder="e.g., 9:00 AM - 6:00 PM"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <div className="flex items-center mb-6">
                <Truck className="w-5 h-5 text-green-600 mr-3" />
                <h2 className="text-lg font-semibold text-slate-900">Delivery Settings</h2>
              </div>
              <div className="border-t border-slate-200 pt-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Delivery Charge (GH₵)
                  </label>
                  <input
                    type="number"
                    name="deliveryCharge"
                    value={settings.deliveryCharge}
                    onChange={handleChange}
                    step="0.01"
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Minimum Order Value (GH₵)
                  </label>
                  <input
                    type="number"
                    name="minOrderValue"
                    value={settings.minOrderValue}
                    onChange={handleChange}
                    step="0.01"
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <div className="flex items-center mb-6">
                <Percent className="w-5 h-5 text-green-600 mr-3" />
                <h2 className="text-lg font-semibold text-slate-900">Discount & Threshold Settings</h2>
              </div>
              <div className="border-t border-slate-200 pt-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Free Delivery Threshold (GH₵)
                  </label>
                  <input
                    type="number"
                    name="freeDeliveryThreshold"
                    value={settings.freeDeliveryThreshold}
                    onChange={handleChange}
                    step="0.01"
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">Orders above this amount will have a zero delivery fee.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Semester Food Discount (%)
                  </label>
                  <input
                    type="number"
                    name="subscriptionFoodDiscountPercent"
                    value={settings.subscriptionFoodDiscountPercent}
                    onChange={handleChange}
                    step="1"
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">Percentage off the food bundle price for subscribers.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Subscriber Delivery Discount (%)
                  </label>
                  <input
                    type="number"
                    name="subscriptionDeliveryDiscountPercent"
                    value={settings.subscriptionDeliveryDiscountPercent}
                    onChange={handleChange}
                    step="1"
                    min="0"
                    max="100"
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">Percentage off the delivery fee for subscribers (if they don't qualify for Free Delivery).</p>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <div className="flex items-center mb-6">
                <Percent className="w-5 h-5 text-purple-600 mr-3" />
                <h2 className="text-lg font-semibold text-slate-900">Loyalty Program Settings</h2>
              </div>
              <div className="border-t border-slate-200 pt-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Spend Amount Step (GH₵)
                  </label>
                  <input
                    type="number"
                    name="loyaltyEarnStepAmount"
                    value={settings.loyaltyEarnStepAmount}
                    onChange={handleChange}
                    step="0.01"
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">Amount to spend to earn a chunk of points.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Points Earned per Step
                  </label>
                  <input
                    type="number"
                    name="loyaltyEarnStepPoints"
                    value={settings.loyaltyEarnStepPoints}
                    onChange={handleChange}
                    step="1"
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">Points awarded for every chunk spent.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Points to Cedi Ratio
                  </label>
                  <input
                    type="number"
                    name="loyaltyRedemptionRatio"
                    value={settings.loyaltyRedemptionRatio}
                    onChange={handleChange}
                    step="1"
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">How many points equal GH₵ 1 discount.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Minimum Points to Redeem
                  </label>
                  <input
                    type="number"
                    name="loyaltyMinPointsToRedeem"
                    value={settings.loyaltyMinPointsToRedeem}
                    onChange={handleChange}
                    step="1"
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">Minimum points balance required to claim a discount.</p>
                </div>
              </div>
            </div>
            <div className="pt-2">
              <div className="flex items-center mb-6">
                <svg className="w-5 h-5 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <h2 className="text-lg font-semibold text-slate-900">Admin Notifications</h2>
              </div>
              <div className="border-t border-slate-200 pt-6">
                <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <div>
                    <h3 className="font-medium text-slate-900">Desktop Push Notifications</h3>
                    <p className="text-sm text-slate-600 mt-1">Get instant alerts when a new order is placed, even when the dashboard is closed.</p>
                  </div>
                  <button
                    type="button"
                    onClick={enablePushNotifications}
                    disabled={pushStatus === 'subscribed' || pushStatus === 'loading'}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      pushStatus === 'subscribed' ? 'bg-green-100 text-green-700' : 
                      'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {pushStatus === 'loading' ? 'Setting up...' : 
                     pushStatus === 'subscribed' ? 'Enabled ✓' : 'Enable Notifications'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-medium rounded-xl transition"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
