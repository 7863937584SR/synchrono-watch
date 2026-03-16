import { motion } from "framer-motion";

interface ReadyToggleProps {
  isReady: boolean;
  onToggle: () => void;
}

const ReadyToggle = ({ isReady, onToggle }: ReadyToggleProps) => {
  return (
    <button
      onClick={onToggle}
      className="w-full relative h-12 rounded-lg overflow-hidden border border-foreground/10 transition-colors duration-150"
    >
      <motion.div
        className="absolute inset-0 bg-primary"
        initial={false}
        animate={{ opacity: isReady ? 1 : 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      />
      <span className={`relative z-10 text-sm font-semibold tracking-wide ${isReady ? "text-primary-foreground" : "text-foreground"}`}>
        {isReady ? "✓ You're Ready" : "Mark as Ready"}
      </span>
    </button>
  );
};

export default ReadyToggle;
