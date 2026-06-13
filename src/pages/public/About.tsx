import { Heart, Users, Target, Award } from 'lucide-react';

export default function About() {
  const styles = `
    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .animate-in {
      animation: fadeInUp 0.6s ease-out forwards;
    }
  `;

  const values = [
    { icon: Heart, title: 'Quality', description: 'Fresh ingredients, prepared daily with care', color: 'from-red-500 to-red-600' },
    { icon: Users, title: 'Community', description: 'Supporting thousands of students', color: 'from-blue-500 to-blue-600' },
    { icon: Target, title: 'Accessibility', description: 'Affordable meals for every budget', color: 'from-emerald-500 to-emerald-600' },
    { icon: Award, title: 'Reliability', description: 'Consistent service you can count on', color: 'from-amber-500 to-amber-600' }
  ];

  const coreValues = [
    { title: 'Excellence', description: 'We never compromise on quality in every meal we prepare' },
    { title: 'Integrity', description: 'Transparent pricing and honest communication with our customers' },
    { title: 'Sustainability', description: 'Environmentally responsible practices in sourcing and delivery' },
    { title: 'Innovation', description: 'Constantly improving our service to better meet student needs' }
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-24">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-16 animate-in">
            <h1 className="text-5xl font-bold text-white mb-4">About Us</h1>
            <p className="text-xl text-gray-300">Dedicated to serving students with quality meals and exceptional service</p>
          </div>

          {/* Story Section */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-12 mb-12 animate-in" style={{ animationDelay: '0.1s' }}>
            <h2 className="text-3xl font-bold text-white mb-6">Our Story</h2>
            <p className="text-gray-300 leading-relaxed mb-4">
              We started with a simple mission: to make it easier for students to access nutritious, affordable meals without the hassle of cooking. Founded by a group of former students, we understand the unique challenges of campus life.
            </p>
            <p className="text-gray-300 leading-relaxed">
              Today, we're proud to serve thousands of students across the region, delivering fresh meals prepared with care to fuel their academic success.
            </p>
          </div>

          {/* Core Values Cards */}
          <div className="grid md:grid-cols-4 gap-6 mb-12">
            {values.map((value, idx) => {
              const Icon = value.icon;
              return (
                <div
                  key={idx}
                  className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center hover:border-white/30 transition-all duration-300 transform hover:scale-105 animate-in"
                  style={{ animationDelay: `${0.2 + idx * 0.1}s` }}
                >
                  <div className={`bg-gradient-to-br ${value.color} p-3 rounded-xl w-fit mx-auto mb-4`}>
                    <Icon className="text-white" size={28} />
                  </div>
                  <h3 className="font-semibold text-white mb-2">{value.title}</h3>
                  <p className="text-gray-400 text-sm">{value.description}</p>
                </div>
              );
            })}
          </div>

          {/* Values Section */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-12 animate-in" style={{ animationDelay: '0.6s' }}>
            <h2 className="text-3xl font-bold text-white mb-8">Our Values</h2>
            <div className="grid md:grid-cols-2 gap-8">
              {coreValues.map((value, idx) => (
                <div key={idx} className="animate-in" style={{ animationDelay: `${0.7 + idx * 0.1}s` }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full"></div>
                    <h3 className="font-semibold text-white text-lg">{value.title}</h3>
                  </div>
                  <p className="text-gray-400">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}