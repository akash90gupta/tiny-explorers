// Colors render as swatches instead of emoji, and skip "the" in sentences.
export default {
  id: 'colors',
  title: 'Colors',
  emoji: '🎨',
  color: '#C3A6FF',
  color2: '#7C5CFF',
  intro: "Let's find the colors!",
  noArticle: true,
  ask: (it) => `Which one is ${it.name}?`,
  items: [
    { id: 'red', name: 'red', swatch: '#FF3B30', sound: 'note:0', phrase: 'Red, like an apple!' },
    { id: 'blue', name: 'blue', swatch: '#1E7BFF', sound: 'note:4', phrase: 'Blue, like the sky!' },
    { id: 'yellow', name: 'yellow', swatch: '#FFD60A', sound: 'note:2', phrase: 'Yellow, like the sun!' },
    { id: 'green', name: 'green', swatch: '#34C759', sound: 'note:3', phrase: 'Green, like the grass!' },
    { id: 'orange', name: 'orange', swatch: '#FF9500', sound: 'note:1', phrase: 'Orange, like an orange!' },
    { id: 'purple', name: 'purple', swatch: '#AF52DE', sound: 'note:5', phrase: 'Purple, like grapes!' },
    { id: 'pink', name: 'pink', swatch: '#FF6FB5', sound: 'note:6', phrase: 'Pink, like a flamingo!' },
    { id: 'brown', name: 'brown', swatch: '#9C6B3F', sound: 'note:7', phrase: 'Brown, like a teddy bear!' },
    { id: 'black', name: 'black', swatch: '#1C1C1E', sound: 'note:8', phrase: 'Black, like the night!' },
    { id: 'white', name: 'white', swatch: '#FFFFFF', sound: 'note:9', phrase: 'White, like snow!' },
  ],
};
