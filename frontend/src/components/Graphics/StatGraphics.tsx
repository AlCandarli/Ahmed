import { motion } from 'framer-motion';

// مكون الجرافيك للطلاب - تصميم ذكي متقدم
export const StudentsGraphic = () => {
  return (
    <div className="stat-graphic students-graphic">
      <svg width="200" height="120" viewBox="0 0 200 120" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="studentsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#667eea" />
            <stop offset="25%" stopColor="#764ba2" />
            <stop offset="50%" stopColor="#f093fb" />
            <stop offset="75%" stopColor="#f5576c" />
            <stop offset="100%" stopColor="#4facfe" />
          </linearGradient>
          <radialGradient id="neuralGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#667eea" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#764ba2" stopOpacity="0.4" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <filter id="advancedGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Neural network background */}
        <circle cx="100" cy="60" r="55" fill="url(#neuralGlow)" opacity="0.3" />

        {/* AI Brain connections */}
        <g stroke="url(#studentsGradient)" strokeWidth="1.5" fill="none" opacity="0.8">
          <motion.path
            d="M30,30 Q70,15 110,35 Q150,20 180,40"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
          />
          <motion.path
            d="M40,70 Q80,45 120,70 Q160,50 190,75"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 2.5, repeat: Infinity, repeatType: "reverse", delay: 0.5 }}
          />
          <motion.path
            d="M20,50 Q60,85 100,50 Q140,85 180,55"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 4, repeat: Infinity, repeatType: "reverse", delay: 1 }}
          />
        </g>

        {/* AI Processing Nodes */}
        <g filter="url(#advancedGlow)">
          {[
            { x: 30, y: 30, r: 8, delay: 0 },
            { x: 110, y: 35, r: 12, delay: 0.3 },
            { x: 180, y: 40, r: 7, delay: 0.6 },
            { x: 40, y: 70, r: 10, delay: 0.9 },
            { x: 120, y: 70, r: 6, delay: 1.2 },
            { x: 190, y: 75, r: 9, delay: 1.5 }
          ].map((node, index) => (
            <motion.circle
              key={index}
              cx={node.x}
              cy={node.y}
              r={node.r}
              fill="url(#studentsGradient)"
              initial={{ scale: 0, opacity: 0 }}
              animate={{
                scale: [0, 1.5, 1],
                opacity: [0, 1, 0.8],
                r: [node.r, node.r * 1.5, node.r]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatType: "reverse",
                delay: node.delay
              }}
            />
          ))}
        </g>

        {/* Quantum particles */}
        {[
          { x: 15, y: 15, r: 2, color: "#667eea" },
          { x: 185, y: 20, r: 1.5, color: "#764ba2" },
          { x: 75, y: 10, r: 1, color: "#f093fb" },
          { x: 125, y: 105, r: 2.5, color: "#f5576c" },
          { x: 60, y: 100, r: 1.8, color: "#4facfe" }
        ].map((particle, index) => (
          <motion.circle
            key={index}
            cx={particle.x}
            cy={particle.y}
            r={particle.r}
            fill={particle.color}
            initial={{ opacity: 0.3 }}
            animate={{
              opacity: [0.3, 1, 0.3],
              scale: [1, 1.3, 1]
            }}
            transition={{
              duration: 3 + index * 0.5,
              repeat: Infinity,
              delay: index * 0.4
            }}
          />
        ))}
      </svg>
    </div>
  );
};

// مكون الجرافيك للدورات
export const CoursesGraphic = () => {
  const bars = [
    { height: 60, delay: 0 },
    { height: 80, delay: 0.1 },
    { height: 45, delay: 0.2 },
    { height: 90, delay: 0.3 },
    { height: 70, delay: 0.4 },
    { height: 85, delay: 0.5 }
  ];

  return (
    <div className="stat-graphic courses-graphic">
      <svg width="200" height="120" viewBox="0 0 200 120">
        <defs>
          <linearGradient id="coursesGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        
        {bars.map((bar, index) => (
          <motion.rect
            key={index}
            x={20 + index * 25}
            y={100 - bar.height}
            width="20"
            height={bar.height}
            fill="url(#coursesGradient)"
            rx="2"
            initial={{ height: 0, y: 100 }}
            animate={{ height: bar.height, y: 100 - bar.height }}
            transition={{ duration: 0.8, delay: bar.delay, ease: "easeOut" }}
          />
        ))}
      </svg>
    </div>
  );
};

// مكون الجرافيك لمعدل النجاح
export const SuccessRateGraphic = () => {
  const percentage = 95;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="stat-graphic success-graphic">
      <svg width="200" height="120" viewBox="0 0 200 120">
        <defs>
          <linearGradient id="successGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        
        {/* دائرة الخلفية */}
        <circle
          cx="100"
          cy="60"
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="8"
        />
        
        {/* دائرة التقدم */}
        <motion.circle
          cx="100"
          cy="60"
          r={radius}
          fill="none"
          stroke="url(#successGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDasharray}
          animate={{ strokeDashoffset }}
          transition={{ duration: 2, ease: "easeInOut" }}
          transform="rotate(-90 100 60)"
        />
        
        {/* النص في المنتصف */}
        <motion.text
          x="100"
          y="65"
          textAnchor="middle"
          fontSize="18"
          fontWeight="bold"
          fill="#3b82f6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1 }}
        >
          {percentage}%
        </motion.text>
      </svg>
    </div>
  );
};

// مكون الجرافيك للتقييم
export const RatingGraphic = () => {
  const stars = [1, 2, 3, 4, 5];
  const rating = 4.8;

  return (
    <div className="stat-graphic rating-graphic">
      <svg width="200" height="120" viewBox="0 0 200 120">
        <defs>
          <linearGradient id="starGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>
        
        {/* النجوم */}
        {stars.map((star, index) => {
          const isFilled = star <= Math.floor(rating);
          const isPartial = star === Math.ceil(rating) && rating % 1 !== 0;
          
          return (
            <motion.g key={index}>
              <motion.path
                d={`M${50 + index * 25},45 L${52 + index * 25},39 L${58 + index * 25},39 L${53 + index * 25},35 L${55 + index * 25},29 L${50 + index * 25},33 L${45 + index * 25},29 L${47 + index * 25},35 L${42 + index * 25},39 L${48 + index * 25},39 Z`}
                fill={isFilled || isPartial ? "url(#starGradient)" : "#e5e7eb"}
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              />
            </motion.g>
          );
        })}
        
        {/* النص */}
        <motion.text
          x="100"
          y="85"
          textAnchor="middle"
          fontSize="16"
          fontWeight="bold"
          fill="#f59e0b"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          {rating}/5
        </motion.text>
      </svg>
    </div>
  );
};
