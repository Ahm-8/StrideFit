import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  Alert, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const ChatScreen = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef();

  const handleSend = async () => {
    if (!input.trim()) return;

    // Add user message to chat
    const userMessage = { text: input, sender: 'user' };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput('');
    setLoading(true);

    // Scroll to bottom when sending message
    scrollViewRef.current?.scrollToEnd({ animated: true });

    try {
      // Call the OpenRouter API
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": "Bearer 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", 
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "model": "deepseek/deepseek-r1:free",
          "messages": [
            {
              "role": "system",
              "content": "You are a fitness expert. Please only respond to questions related to fitness. Do not answer questions about religion, sports, politics, programming. You can assist with questions about health (mental, physical and emotional)."
            },
            {
              "role": "user",
              "content": input // Use the user's input
            }
          ]
        })
      });

      const data = await response.json();
      console.log('API Response:', data); // Log the response

      if (response.ok) {
        // Add API response to chat
        const botMessage = { text: data.choices[0].message.content, sender: 'bot' };
        setMessages(prevMessages => [...prevMessages, botMessage]);
      } else {
        Alert.alert('Error', data.error.message || 'Failed to fetch response from OpenRouter API');
      }
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'An error occurred while fetching the response');
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]); 
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.header}>
          <Text style={styles.title}>AI Fitness Assistant</Text>
          <TouchableOpacity onPress={handleClearChat} style={styles.clearButton}>
            <Ionicons name="trash-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        
        <ScrollView 
          ref={scrollViewRef}
          style={styles.chatContainer}
          contentContainerStyle={styles.chatContent}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubble-outline" size={48} color="#666" />
              <Text style={styles.emptyStateText}>
                Ask me anything about fitness, workouts, or nutrition
              </Text>
            </View>
          ) : (
            messages.map((message, index) => (
              <View 
                key={index} 
                style={[
                  styles.messageWrapper,
                  message.sender === 'user' ? styles.userWrapper : styles.botWrapper
                ]}
              >
                {message.sender === 'bot' && (
                  <View style={styles.botAvatar}>
                    <Ionicons name="fitness" size={20} color="#fff" />
                  </View>
                )}
                <View style={[
                  styles.messageContainer,
                  message.sender === 'user' ? styles.userMessage : styles.botMessage
                ]}>
                  <Text style={styles.messageText}>{message.text}</Text>
                </View>
              </View>
            ))
          )}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#8B5CF6" />
              <Text style={styles.loadingText}>Thinking...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Ask about fitness..."
            placeholderTextColor="#666"
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleSend}
            multiline
            maxLength={500}
            onFocus={() => {
              setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
              }, 100);
            }}
          />
          <TouchableOpacity 
            onPress={handleSend} 
            style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
            disabled={!input.trim()}
          >
            <Ionicons name="send" size={24} color={input.trim() ? "#fff" : "#666"} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2E2E2E',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  clearButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#2E2E2E',
  },
  chatContainer: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyStateText: {
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    fontSize: 16,
  },
  messageWrapper: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end',
  },
  userWrapper: {
    justifyContent: 'flex-end',
  },
  botWrapper: {
    justifyContent: 'flex-start',
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  messageContainer: {
    borderRadius: 20,
    padding: 12,
    maxWidth: '80%',
  },
  userMessage: {
    backgroundColor: '#8B5CF6',
    borderBottomRightRadius: 4,
  },
  botMessage: {
    backgroundColor: '#2E2E2E',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 16,
  },
  loadingText: {
    color: '#8B5CF6',
    marginLeft: 8,
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#2E2E2E',
    backgroundColor: '#000000',
  },
  input: {
    flex: 1,
    backgroundColor: '#2E2E2E',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    marginLeft: 12,
    backgroundColor: '#8B5CF6',
    borderRadius: 20,
    padding: 10,
  },
  sendButtonDisabled: {
    backgroundColor: '#2E2E2E',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
});

export default ChatScreen;