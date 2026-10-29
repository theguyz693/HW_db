// ──────────────────────────────────────────────
// Placeholder pages for routes that will be built in later milestones
// ──────────────────────────────────────────────

import { motion } from 'framer-motion';
import { Construction } from 'lucide-react';

function ComingSoonPage({ title }: { title: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[60vh] text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-bg-elevated border border-border flex items-center justify-center mb-5">
        <Construction size={28} className="text-text-muted" />
      </div>
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <p className="text-text-secondary max-w-sm">
        This feature is coming in a future milestone. The architecture is already in place.
      </p>
    </motion.div>
  );
}

export function CollectionsPage() {
  return <ComingSoonPage title="Collections" />;
}

export function SearchPage() {
  return <ComingSoonPage title="Search" />;
}

export function ScannerPage() {
  return <ComingSoonPage title="Barcode Scanner" />;
}

export function StatsPage() {
  return <ComingSoonPage title="Statistics" />;
}

export function ProfilePage() {
  return <ComingSoonPage title="Profile" />;
}

export function SettingsPage() {
  return <ComingSoonPage title="Settings" />;
}
