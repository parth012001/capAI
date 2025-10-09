import { motion } from 'framer-motion';
import { Card } from '../ui/Card';

const steps = [
  { num: '1', title: 'Connect Securely', desc: 'One-click Google sign-in. Captain analyzes your writing style from sent emails and syncs with your calendar.', gradient: 'from-blue-500 to-blue-600', delay: 0 },
  { num: '2', title: 'AI Does the Work', desc: 'Emails get auto-drafted in your voice. Meeting requests are detected, and calendar slots are found automatically.', gradient: 'from-purple-500 to-purple-600', delay: 0.2 },
  { num: '3', title: 'Review & Approve', desc: 'You stay in control. Review drafts, approve meetings, or edit before sending. Captain learns from every interaction.', gradient: 'from-pink-500 to-purple-600', delay: 0.4 }
];

export const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="min-h-screen flex items-center justify-center py-24 px-6 bg-white relative scroll-mt-20">
      {/* Top Wave Divider */}
      <div className="absolute top-0 left-0 right-0 overflow-hidden leading-none">
        <svg className="relative block w-full h-20" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" fill="rgb(239 246 255)"></path>
        </svg>
      </div>
      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
            How It Works
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Three simple steps to automate your email and calendar
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: step.delay }}
              whileHover={{ y: -10, transition: { duration: 0.3 } }}
            >
              <Card className="text-center p-10 hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-blue-200 bg-white/90 backdrop-blur-sm h-full">
                <motion.div
                  className={`w-20 h-20 bg-gradient-to-br ${step.gradient} rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl`}
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.6 }}
                >
                  <span className="text-4xl font-bold text-white">{step.num}</span>
                </motion.div>
                <h3 className="text-2xl font-semibold text-slate-900 mb-4">
                  {step.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {step.desc}
                </p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
