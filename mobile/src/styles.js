import { StyleSheet } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F9FF'
  },
  header: {
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 24,
    backgroundColor: '#4B6CFF'
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  titleWhite: { color: '#fff', fontSize: 24, fontWeight: '800' },
  titleDark: { color: '#111827', fontSize: 24, fontWeight: '800' },
  subtitle: { color: '#6B7280', fontSize: 14, lineHeight: 20 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 24
  },
  buttonPrimary: {
    backgroundColor: '#4B6CFF',
    paddingVertical: 14,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  buttonSecondary: {
    backgroundColor: '#F5F7FF',
    paddingVertical: 14,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  buttonTextDark: { color: '#111827', fontSize: 16, fontWeight: '700' },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E6E9F2',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    color: '#111827'
  },
  smallText: { color: '#6B7280', fontSize: 14 },
  sectionTitle: { color: '#111827', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  pill: {
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 10,
    backgroundColor: '#F5F7FF'
  },
  pillActive: {
    backgroundColor: '#4B6CFF'
  },
  pillText: {
    color: '#4B6CFF',
    fontWeight: '700'
  },
  pillTextActive: {
    color: '#FFFFFF'
  },
  tag: {
    backgroundColor: '#EAF0FF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    alignSelf: 'flex-start'
  },
  tagText: {
    color: '#4B6CFF',
    fontWeight: '700',
    fontSize: 12
  }
});
