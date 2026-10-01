// Body parts work best with a grown-up: after each answer, point to your own!
export default {
  id: 'body',
  title: 'My Body',
  emoji: '👃',
  color: '#FFD6A5',
  color2: '#FFAD69',
  intro: "Let's find your nose, your eyes, and more!",
  hi: { title: "मेरा शरीर", intro: "चलो नाक, आँखें और बहुत कुछ ढूँढें!" },
  items: [
    { id: 'nose', name: 'nose', emoji: '👃', sound: 'sniff', phrase: 'Nose! Can you touch your nose?', hi: { name: "नाक", phrase: "नाक! अपनी नाक छुओ!" } },
    { id: 'eyes', name: 'eyes', emoji: '👀', sound: 'note:7', plural: true, phrase: 'Eyes! Can you blink your eyes?', hi: { name: "आँखें", phrase: "आँखें! आँखें झपकाओ!", plural: true } },
    { id: 'ear', name: 'ear', emoji: '👂', sound: 'bikebell', phrase: 'Ear! Ring ring, we hear with our ears!', hi: { name: "कान", phrase: "कान! हम कान से सुनते हैं!" } },
    { id: 'mouth', name: 'mouth', emoji: '👄', sound: 'kiss', phrase: 'Mouth! Can you blow a kiss?', hi: { name: "मुँह", phrase: "मुँह! एक पप्पी दो!" } },
    { id: 'hand', name: 'hand', emoji: '✋', sound: 'clap', phrase: 'Hand! Clap your hands!', hi: { name: "हाथ", phrase: "हाथ! ताली बजाओ!" } },
    { id: 'foot', name: 'foot', emoji: '🦶', sound: 'footsteps', phrase: 'Foot! Stomp your feet!', hi: { name: "पैर", phrase: "पैर! पैर पटको!" } },
    { id: 'teeth', name: 'teeth', emoji: '🦷', sound: 'toothbrush', plural: true, phrase: 'Teeth! We brush our teeth! Brush brush!', hi: { name: "दाँत", phrase: "दाँत! हम दाँत ब्रश करते हैं!", plural: true } },
    { id: 'tongue', name: 'tongue', emoji: '👅', sound: 'raspberry', phrase: 'Tongue! Can you stick out your tongue? Pbbbt!', hi: { name: "जीभ", phrase: "जीभ! जीभ बाहर निकालो!" } },
    { id: 'arm', name: 'arm', emoji: '💪', sound: 'note:4', phrase: 'Arm! Show me your strong arms!', hi: { name: "बाँह", phrase: "बाँह! अपनी ताकत दिखाओ!" } },
    { id: 'leg', name: 'leg', emoji: '🦵', sound: 'kick', phrase: 'Leg! Can you kick your leg?', hi: { name: "टाँग", phrase: "टाँग! टाँग से किक करो!" } },
  ],
};
