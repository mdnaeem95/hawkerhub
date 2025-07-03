// apps/mobile/src/components/shared/LanguageSelector.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  FlatList,
} from 'react-native';
import { Card } from '@components/ui/Card';
import { theme, spacing } from '@constants/theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useLanguageStore } from '@/store/languageStore';

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
];

export const LanguageSelector: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const { currentLanguage, setLanguage } = useLanguageStore();
  
  const currentLang = languages.find(l => l.code === currentLanguage);

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        style={styles.trigger}
      >
        <Text style={styles.flag}>{currentLang?.flag}</Text>
        <Text style={styles.langCode}>{currentLang?.code.toUpperCase()}</Text>
        <Icon name="chevron-down" size={16} color={theme.colors.onSurface} />
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable 
          style={styles.overlay}
          onPress={() => setVisible(false)}
        >
          <Card style={styles.modal}>
            <Text style={styles.title}>Select Language</Text>
            
            <FlatList
              data={languages}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setLanguage(item.code);
                    setVisible(false);
                  }}
                  style={[
                    styles.languageItem,
                    currentLanguage === item.code && styles.selectedItem,
                  ]}
                >
                  <Text style={styles.flag}>{item.flag}</Text>
                  <Text style={[
                    styles.languageName,
                    currentLanguage === item.code && styles.selectedText,
                  ]}>
                    {item.name}
                  </Text>
                  {currentLanguage === item.code && (
                    <Icon 
                      name="check" 
                      size={20} 
                      color={theme.colors.primary} 
                    />
                  )}
                </Pressable>
              )}
            />
          </Card>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceVariant,
  },
  flag: {
    fontSize: 20,
    marginRight: spacing.xs,
  },
  langCode: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: spacing.xs,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '80%',
    maxWidth: 300,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: 8,
  },
  selectedItem: {
    backgroundColor: theme.colors.surfaceVariant,
  },
  languageName: {
    flex: 1,
    fontSize: 16,
    marginLeft: spacing.md,
  },
  selectedText: {
    fontWeight: '600',
    color: theme.colors.primary,
  },
});