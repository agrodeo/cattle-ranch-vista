import { useState, useEffect } from 'react';

interface ActivityPreferences {
  activeTab: string;
  density: 'compact' | 'comfortable';
  collapsedSections: Record<string, boolean>;
}

const defaultPreferences: ActivityPreferences = {
  activeTab: 'resumen',
  density: 'comfortable',
  collapsedSections: {
    recentActivities: true,
    activityTypes: true,
  },
};

export function useActivityPreferences() {
  const [preferences, setPreferences] = useState<ActivityPreferences>(defaultPreferences);

  useEffect(() => {
    const saved = localStorage.getItem('activity-preferences');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPreferences({ ...defaultPreferences, ...parsed });
      } catch (error) {
        console.error('Error parsing activity preferences:', error);
      }
    }
  }, []);

  const updatePreferences = (updates: Partial<ActivityPreferences>) => {
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);
    localStorage.setItem('activity-preferences', JSON.stringify(newPreferences));
  };

  const toggleSection = (sectionKey: string) => {
    const newCollapsed = {
      ...preferences.collapsedSections,
      [sectionKey]: !preferences.collapsedSections[sectionKey],
    };
    updatePreferences({ collapsedSections: newCollapsed });
  };

  const setActiveTab = (tab: string) => {
    updatePreferences({ activeTab: tab });
  };

  const setDensity = (density: 'compact' | 'comfortable') => {
    updatePreferences({ density });
  };

  return {
    preferences,
    updatePreferences,
    toggleSection,
    setActiveTab,
    setDensity,
  };
}