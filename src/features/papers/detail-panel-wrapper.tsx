'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useMediaQuery } from '@/hooks/use-media-query';
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from '@/components/ui/drawer';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';

interface DetailPanelWrapperProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export default function DetailPanelWrapper({ open, onClose, children }: DetailPanelWrapperProps) {
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const isTablet = useMediaQuery('(min-width: 768px)');

  if (isDesktop) {
    return (
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.2 }}
            className="h-[calc(100vh-200px)] border-l border-border overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  if (isTablet) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent
          side="right"
          className="w-[460px] sm:max-w-[460px] p-0 bg-background border-l border-border"
        >
          <VisuallyHidden.Root>
            <SheetTitle>Paper Details</SheetTitle>
          </VisuallyHidden.Root>
          <div className="h-full">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
      <DrawerContent className="max-h-[92vh] bg-background border-border">
        <VisuallyHidden.Root>
          <DrawerTitle>Paper Details</DrawerTitle>
        </VisuallyHidden.Root>
        <div className="h-[85vh] overflow-hidden">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
