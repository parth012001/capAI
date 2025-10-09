import { motion } from 'framer-motion';

const securityFeatures = [
  { icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', title: '256-bit AES Encryption', desc: 'Industry-standard encryption for all sensitive data in transit and at rest.', gradient: 'from-green-400 to-green-600', delay: 0 },
  { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', title: 'OAuth 2.0', desc: 'Google\'s secure authentication. We never see your password.', gradient: 'from-blue-400 to-blue-600', delay: 0.15 },
  { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', title: 'You Approve All Actions', desc: 'We draft replies and suggest meetings. You review and approve before anything is sent.', gradient: 'from-purple-400 to-purple-600', delay: 0.3 },
  { icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', title: 'Privacy Focused', desc: 'Your data is encrypted and secure. Revoke access anytime from settings.', gradient: 'from-orange-400 to-pink-600', delay: 0.45 }
];

export const SecuritySection = () => {
  return (
    <section id="security" className="min-h-screen flex items-center justify-center py-24 px-6 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden scroll-mt-20">
      {/* Animated background */}
      <motion.div
        className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-l from-blue-600/20 to-purple-600/20 rounded-full filter blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          x: [0, -50, 0],
          y: [0, 50, 0]
        }}
        transition={{ duration: 10, repeat: Infinity }}
      />

      <div className="max-w-6xl mx-auto relative z-10 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Your Data, Your Control
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            We take security seriously. Your trust is our top priority.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-6">
          {securityFeatures.map((item, index) => (
            <motion.div
              key={index}
              className="bg-white/10 backdrop-blur-md rounded-2xl p-7 border border-white/20 hover:border-white/40 hover:bg-white/15 transition-all duration-300"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: item.delay }}
              whileHover={{ y: -8, scale: 1.02 }}
            >
              <motion.div
                className={`w-14 h-14 bg-gradient-to-br ${item.gradient} rounded-2xl flex items-center justify-center mb-5 shadow-xl`}
                whileHover={{ rotate: 360, scale: 1.1 }}
                transition={{ duration: 0.6 }}
              >
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                </svg>
              </motion.div>
              <h3 className="text-xl font-semibold text-white mb-3">{item.title}</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
