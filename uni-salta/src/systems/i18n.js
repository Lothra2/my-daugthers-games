// Spanish (default) and English strings. t('key', {vars}) with {name} placeholders.
const ES = {
  'title.line1': 'al entrar...', 'title.line2': 'ya vas a jugar!', 'title.tap': 'Toca para empezar',
  'title.hello': '¡Hola, {name}!', 'title.credit': 'Una idea de Sophie',
  'title.play': 'Uni-salta', 'title.scores': 'Récords', 'title.settings': 'Ajustes', 'title.gallery': 'Los dibujos de Sophie', 'title.fullscreen': 'Pantalla completa',
  'mode.title': '¿Cómo quieres jugar?', 'mode.easy': 'Nubecita', 'mode.easy.sub': 'fácil, sin perder vidas', 'mode.normal': 'Arcoíris', 'mode.normal.sub': 'normal, con 3 vidas',
  'mode.start': 'Empezar en', 'mode.world': 'Mundo {n}',
  'name.title': '¿Cómo se llama tu unicornio?', 'name.ready': '¡Listo!', 'name.placeholder': 'Uni',
  'world.card': 'MUNDO {n}', 'world.lap': 'Vuelta {n}',
  'w1': 'Nubes de Algodón', 'w2': 'Valle Arcoíris', 'w3': 'Bosque de Chupetas', 'w4': 'Cielo Estrellado', 'w5': 'Tormenta Mágica', 'w6': 'Castillo Cósmico de Caramelo', 'w7': 'Playa de Gominolas', 'w8': 'Montaña de Helado', 'w9': 'Ciudad Arcade',
  'boss.queen': 'Reina Serpiente', 'boss.king': 'Rey Fantasma', 'boss.warn': '¡Llega el jefe!', 'boss.hint': 'Esquiva lo morado. ¡Devuelve las estrellas!', 'boss.win': '¡Ganaste!',
  'hud.meters': '{n} m', 'hud.fast': 'Rápido', 'hud.slow': 'Lento', 'hud.inv': 'Arcoíris',
  'pause.title': 'Pausa', 'pause.resume': 'Seguir', 'pause.restart': 'Otra vez', 'pause.settings': 'Ajustes', 'pause.menu': 'Menú', 'pause.finish': 'Terminar',
  'settings.title': 'Ajustes', 'settings.music': 'Música', 'settings.sfx': 'Efectos', 'settings.lang': 'Idioma', 'settings.shake': 'Menos sacudidas', 'settings.flash': 'Menos destellos', 'settings.hints': 'Ayuda táctil', 'settings.name': 'Nombre del unicornio', 'settings.reset': 'Borrar récords (mantén 2 s)', 'settings.back': 'Volver',
  'over.title': '¡Qué carrera, {name}!', 'over.easy': '¡Lo lograste, {name}!', 'over.score': 'Puntos', 'over.meters': 'Metros', 'over.candies': 'Caramelitos', 'over.best': 'Mejor', 'over.world': 'Mundo', 'over.record': '¡Nuevo récord!', 'over.again': '¡Otra vez!', 'over.menu': 'Menú',
  'over.msg.close': '¡Casi llegas al Mundo {n}!', 'over.msg.candy': '¡Comiste {n} caramelitos!', 'over.msg.stomp': '¡{n} pisotones!', 'over.msg.far': '¡Llegaste lejísimos!',
  'scores.title': 'Récords', 'scores.empty': 'Todavía no hay récords', 'scores.normal': 'Arcoíris', 'scores.easy': 'Nubecita',
  'gallery.title': 'Los dibujos de Sophie', 'gallery.sub': 'Sophie, 7 años', 'gallery.locked': 'Llega al Mundo 3 para desbloquear',
  'cut.fast': 'Los obstáculos se vuelven caramelos', 'cut.slow': 'El tiempo se hace lento', 'cut.inv': 'Nada te puede hacer daño',
  'call.perfect': '¡Perfecto!', 'call.fast': '¡Súper rápido!', 'call.slow': 'Despaaacio...', 'call.inv': '¡Arcoíris!', 'call.ouch': '¡Ay!', 'call.heart': '¡Una vida más!', 'call.record': '¡Nuevo récord!', 'call.go': '¡Uni-salta!', 'call.lap': '¡Otra vuelta!', 'call.wave': '¡Bien!',
  'rotate': 'Gira tu pantalla', 'hint.jump': 'SALTA', 'hint.crouch': 'AGÁCHATE',
};
const EN = {
  'title.line1': 'get ready...', 'title.line2': "you're about to play!", 'title.tap': 'Tap to start',
  'title.hello': 'Hi, {name}!', 'title.credit': 'An idea by Sophie',
  'title.play': 'Uni-salta', 'title.scores': 'Records', 'title.settings': 'Settings', 'title.gallery': "Sophie's drawings", 'title.fullscreen': 'Fullscreen',
  'mode.title': 'How do you want to play?', 'mode.easy': 'Little Cloud', 'mode.easy.sub': 'easy, never lose lives', 'mode.normal': 'Rainbow', 'mode.normal.sub': 'normal, 3 lives',
  'mode.start': 'Start at', 'mode.world': 'World {n}',
  'name.title': "What's your unicorn's name?", 'name.ready': 'Ready!', 'name.placeholder': 'Uni',
  'world.card': 'WORLD {n}', 'world.lap': 'Lap {n}',
  'w1': 'Cotton Clouds', 'w2': 'Rainbow Valley', 'w3': 'Lollipop Forest', 'w4': 'Starry Sky', 'w5': 'Magic Storm', 'w6': 'Cosmic Candy Castle', 'w7': 'Gummy Beach', 'w8': 'Ice-Cream Glacier', 'w9': 'Arcade City',
  'boss.queen': 'Serpent Queen', 'boss.king': 'Ghost King', 'boss.warn': 'Boss incoming!', 'boss.hint': 'Dodge the purple ones. Hit the stars back!', 'boss.win': 'You win!',
  'hud.meters': '{n} m', 'hud.fast': 'Fast', 'hud.slow': 'Slow', 'hud.inv': 'Rainbow',
  'pause.title': 'Paused', 'pause.resume': 'Resume', 'pause.restart': 'Again', 'pause.settings': 'Settings', 'pause.menu': 'Menu', 'pause.finish': 'Finish',
  'settings.title': 'Settings', 'settings.music': 'Music', 'settings.sfx': 'Effects', 'settings.lang': 'Language', 'settings.shake': 'Less shaking', 'settings.flash': 'Less flashing', 'settings.hints': 'Touch hints', 'settings.name': "Unicorn's name", 'settings.reset': 'Erase records (hold 2 s)', 'settings.back': 'Back',
  'over.title': 'What a run, {name}!', 'over.easy': 'You did it, {name}!', 'over.score': 'Score', 'over.meters': 'Meters', 'over.candies': 'Candies', 'over.best': 'Best', 'over.world': 'World', 'over.record': 'New record!', 'over.again': 'Again!', 'over.menu': 'Menu',
  'over.msg.close': 'So close to World {n}!', 'over.msg.candy': 'You ate {n} candies!', 'over.msg.stomp': '{n} stomps!', 'over.msg.far': 'You went so far!',
  'scores.title': 'Records', 'scores.empty': 'No records yet', 'scores.normal': 'Rainbow', 'scores.easy': 'Little Cloud',
  'gallery.title': "Sophie's drawings", 'gallery.sub': 'Sophie, age 7', 'gallery.locked': 'Reach World 3 to unlock',
  'cut.fast': 'Obstacles turn into candy', 'cut.slow': 'Time slows down', 'cut.inv': 'Nothing can hurt you',
  'call.perfect': 'Perfect!', 'call.fast': 'Super fast!', 'call.slow': 'Sloooow...', 'call.inv': 'Rainbow!', 'call.ouch': 'Oops!', 'call.heart': 'Extra life!', 'call.record': 'New record!', 'call.go': 'Uni-salta!', 'call.lap': 'Another lap!', 'call.wave': 'Nice!',
  'rotate': 'Turn your screen', 'hint.jump': 'JUMP', 'hint.crouch': 'DUCK',
};
export const STRINGS = { es: ES, en: EN };

export class I18n {
  constructor(lang) { this.lang = lang || (String(globalThis.navigator?.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es'); }
  setLang(l) { this.lang = l === 'en' ? 'en' : 'es'; }
  t(key, vars = {}) {
    let s = (STRINGS[this.lang] && STRINGS[this.lang][key]) ?? STRINGS.es[key] ?? key;
    for (const k of Object.keys(vars)) s = s.replaceAll(`{${k}}`, String(vars[k]));
    return s;
  }
}
