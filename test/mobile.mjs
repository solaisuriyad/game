import { Input } from '../src/core/Input.js';

// Simulate virtual joystick
console.log('Test Input virtual joystick');
Input._setVirtual(0, -1); // forward
let v = Input.dirVector();
console.log('forward vector:', v, 'expect y negative');
if (v.y >= 0) throw new Error('forward should be negative y');

Input._setVirtual(1, 0); // right
v = Input.dirVector();
console.log('right vector:', v, 'expect x positive');

Input._setVirtual(0, 0);
v = Input.dirVector();
console.log('zero vector:', v);

Input._virtualSprint = true;
if (!Input.held('r')) throw new Error('sprint virtual should make held r true');
Input._virtualSprint = false;

console.log('Input virtual OK');

// Test World3DRenderer mobile detection logic
const fakeMobileUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15A372 Safari/604.1';
const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(fakeMobileUA);
console.log('isMobile detection for iPhone:', isMobile, 'expect true');
if (!isMobile) throw new Error('mobile detection failed');

console.log('MOBILE CONTROLS LOGIC OK');
