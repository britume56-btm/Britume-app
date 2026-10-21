
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function BritumeEyesAssistant() {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [question, setQuestion] = useState('');
  const [reply, setReply] = useState(
    'Hello! I am BRITUME EYES. I can help you navigate BRITUME.'
  );
  const blink = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let active = true;

    const blinkOnce = () => {
      if (!active) return;

      Animated.sequence([
        Animated.timing(blink, {
          toValue: 0.08,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(blink, {
          toValue: 1,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start();
    };

    const interval = setInterval(blinkOnce, 3500);

    return () => {
      active = false;
      clearInterval(interval);
      blink.stopAnimation();
    };
  }, [blink]);

  function sendQuestion() {
    const message = question.trim().toLowerCase();
    if (!message) return;

    if (message.includes('help')) {
      setReply(
        'I am your BRITUME assistant. Ask for help finding features inside the app.'
      );
    } else if (message.includes('setting')) {
      setReply(
        'You can use the BRITUME settings section to manage your app preferences.'
      );
    } else if (message.includes('profile')) {
      setReply(
        'Look for your profile in the BRITUME navigation menu.'
      );
    } else {
      setReply(
        'AI connection is not configured yet. I can receive your text, but I cannot answer general questions until the secure AI service is connected.'
      );
    }

    setQuestion('');
  }

  return (
    <View pointerEvents="box-none" style={styles.overlay}>
      {open && (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.heading}>BRITUME EYES</Text>
            <Pressable onPress={() => setOpen(false)}>
              <Text style={styles.close}>CLOSE</Text>
            </Pressable>
          </View>

          <Text style={styles.description}>
            Your in-app assistant
          </Text>

          <ScrollView style={styles.replyArea}>
            <Text style={styles.reply}>{reply}</Text>
          </ScrollView>

          <TextInput
            value={question}
            onChangeText={setQuestion}
            placeholder="Ask BRITUME..."
            placeholderTextColor="#888888"
            onSubmitEditing={sendQuestion}
            returnKeyType="send"
            style={styles.input}
          />

          <Pressable style={styles.sendButton} onPress={sendQuestion}>
            <Text style={styles.sendText}>SEND</Text>
          </Pressable>

          <Pressable
            style={[styles.listenButton, listening && styles.listening]}
            onPress={() => setListening(value => !value)}
          >
            <Text style={styles.listenText}>
              {listening ? 'STOP LISTENING' : 'START LISTENING'}
            </Text>
          </Pressable>

          <Text style={styles.note}>
            Voice and AI services still need to be connected.
          </Text>
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open BRITUME EYES assistant"
        onPress={() => setOpen(value => !value)}
        style={styles.floatingButton}
      >
        <Animated.View
          style={[styles.eyes, { transform: [{ scaleY: blink }] }]}
        >
          <View style={styles.eye}>
            <View style={styles.pupil} />
          </View>
          <View style={styles.eye}>
            <View style={styles.pupil} />
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 999,
    elevation: 20,
    pointerEvents: 'box-none',
  },
  floatingButton: {
    position: 'absolute',
    right: 18,
    bottom: 28,
    width: 68,
    height: 58,
    borderRadius: 30,
    backgroundColor: '#080808',
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 12,
  },
  eyes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  eye: {
    width: 23,
    height: 15,
    borderRadius: 12,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pupil: {
    width: 7,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#000000',
  },
  panel: {
    position: 'absolute',
    right: 12,
    bottom: 98,
    width: 290,
    maxWidth: '92%',
    backgroundColor: '#080808',
    borderWidth: 1,
    borderColor: '#D4AF37',
    borderRadius: 18,
    padding: 16,
    elevation: 15,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heading: {
    color: '#D4AF37',
    fontSize: 17,
    fontWeight: '900',
  },
  close: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  description: {
    color: '#AAAAAA',
    marginTop: 6,
    marginBottom: 12,
  },
  replyArea: {
    maxHeight: 120,
    marginBottom: 12,
  },
  reply: {
    color: '#FFFFFF',
    lineHeight: 21,
  },
  input: {
    color: '#FFFFFF',
    backgroundColor: '#171717',
    borderColor: '#444444',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  sendButton: {
    backgroundColor: '#D4AF37',
    borderRadius: 9,
    alignItems: 'center',
    padding: 12,
    marginTop: 8,
  },
  sendText: {
    color: '#000000',
    fontWeight: '900',
  },
  listenButton: {
    borderWidth: 1,
    borderColor: '#D4AF37',
    borderRadius: 9,
    alignItems: 'center',
    padding: 12,
    marginTop: 8,
  },
  listening: {
    borderColor: '#FF4545',
    backgroundColor: '#260909',
  },
  listenText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  note: {
    color: '#999999',
    fontSize: 10,
    lineHeight: 15,
    marginTop: 10,
  },
});
