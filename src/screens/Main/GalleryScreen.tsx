diff --git a/src/screens/Main/GalleryScreen.tsx b/src/screens/Main/GalleryScreen.tsx
--- a/src/screens/Main/GalleryScreen.tsx
+++ b/src/screens/Main/GalleryScreen.tsx
@@
 import React, { useCallback, useEffect, useMemo, useState } from 'react';
 import {
+AppState,
 ActivityIndicator,
 Alert,
@@
 return () => { active = false; };

 }, []);

+// Re-lock Hidden Gallery and close any preview when BRITUME leaves the foreground.
+useEffect(() => {
+const subscription = AppState.addEventListener('change', state => {
+  if (state !== 'active') {
+    setUnlocked(false);
+    setSelected(null);
+    setTab(current => current === 'hidden' ? 'all' : current);
+  }
+});
+
+return () => subscription.remove();
+}, []);
+
 const importFiles = useCallback(async () => {
@@
-          if (item.id.startsWith('import-') || item.id.startsWith('edited-')) {
+          if (
+            item.id.startsWith('import-') ||
+            item.id.startsWith('edited-') ||
+            item.id.startsWith('device-')
+          ) {
             try {
               if (item.uri.startsWith(FileSystem.documentDirectory || '')) {
                 await FileSystem.deleteAsync(item.uri, { idempotent: true });
*** End Patch
