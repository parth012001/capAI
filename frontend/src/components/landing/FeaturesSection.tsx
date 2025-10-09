import { motion } from 'framer-motion';

const mainFeatures = [
  { icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z', title: 'Writes Like You', desc: 'Analyzes 50+ of your sent emails to match your tone, style, and personality perfectly.', gradient: 'from-blue-500 to-blue-600', delay: 0 },
  { icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', title: 'Smart Calendar Management', desc: 'Detects meeting requests, checks your availability, handles timezones, and books meetings automatically.', gradient: 'from-purple-500 to-purple-600', delay: 0.15 },
  { icon: 'M13 10V3L4 14h7v7l9-11h-7z', title: 'Real-Time Drafts', desc: 'The moment an email arrives, your draft is ready. Context-aware, thread-smart, relationship-conscious.', gradient: 'from-pink-500 to-purple-600', delay: 0.3 }
];

const additionalFeatures = [
  { icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4', title: 'To-Do ➜ Done', desc: 'Converts meeting requests and action items from your inbox directly into calendar events and completed tasks.', gradient: 'from-blue-50 to-purple-50', border: 'border-blue-100', iconGradient: 'from-blue-500 to-blue-600' },
  { icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', title: 'Timezone Intelligence', desc: 'Automatically handles timezone conversions and suggests optimal meeting times across global teams.', gradient: 'from-purple-50 to-pink-50', border: 'border-purple-100', iconGradient: 'from-purple-500 to-purple-600' },
  { icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z', title: 'Thread Context', desc: 'Understands email threads, previous conversations, and relationships to craft perfect responses.', gradient: 'from-green-50 to-blue-50', border: 'border-green-100', iconGradient: 'from-green-500 to-green-600' },
  { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', title: 'Availability Sync', desc: 'Real-time calendar sync ensures meeting proposals only suggest times when you\'re actually free.', gradient: 'from-orange-50 to-pink-50', border: 'border-orange-100', iconGradient: 'from-orange-500 to-orange-600' }
];

export const FeaturesSection = () => {
  return (
    <section id="features" className="min-h-screen flex items-center justify-center py-24 px-6 bg-gradient-to-br from-blue-50 via-purple-50/30 to-white relative scroll-mt-20">
      {/* Decorative gradient orbs */}
      <motion.div
        className="absolute top-20 right-10 w-72 h-72 bg-gradient-to-r from-blue-300/30 to-purple-300/30 rounded-full filter blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3]
        }}
        transition={{ duration: 8, repeat: Infinity }}
      />
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            Why Captain AI?
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            An email + calendar assistant that actually sounds like you
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-10 mb-16">
          {mainFeatures.map((feature, index) => (
            <motion.div
              key={index}
              className="text-center group"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: feature.delay }}
            >
              <motion.div
                className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg`}
                whileHover={{ scale: 1.2, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={feature.icon} />
                </svg>
              </motion.div>
              <h3 className="text-2xl font-semibold text-slate-900 mb-3 group-hover:text-blue-600 transition-colors">
                {feature.title}
              </h3>
              <p className="text-slate-600 leading-relaxed">
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Additional Features Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {additionalFeatures.map((item, index) => (
            <motion.div
              key={index}
              className={`bg-gradient-to-br ${item.gradient} rounded-2xl p-8 border-2 ${item.border} shadow-lg`}
              initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -5 }}
            >
              <div className="flex items-start gap-5">
                <motion.div
                  className={`w-12 h-12 bg-gradient-to-br ${item.iconGradient} rounded-xl flex items-center justify-center flex-shrink-0 shadow-md`}
                  whileHover={{ rotate: 360 }}
                  transition={{ duration: 0.6 }}
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                  </svg>
                </motion.div>
                <div>
                  <h4 className="font-bold text-slate-900 mb-2 text-lg">{item.title}</h4>
                  <p className="text-slate-700 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
