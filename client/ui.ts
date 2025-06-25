// client/ui.ts

export function updateUI(lives: number, cooldown: number, playerCount?: number, mineCount?: number) {
  const ui = document.getElementById("ui");
  if (!ui) return;
  
  const cooldownDisplay = cooldown > 0 ? `Cooldown ${(cooldown/1000).toFixed(1)}s` : "Ready";
  const statusColor = cooldown > 0 ? "#ff6b6b" : "#51cf66";
  
  ui.innerHTML = `
    <div style="background: rgba(0,0,0,0.8); padding: 15px; border-radius: 10px; margin-bottom: 10px; border: 2px solid #4CAF50;">
      <div style="font-size: 20px; font-weight: bold; color: #ff6b6b;">❤️ Lives: ${lives}</div>
      <div style="font-size: 16px; color: ${statusColor};">⏱️ Status: ${cooldownDisplay}</div>
      ${playerCount ? `<div style="font-size: 14px; color: #74c0fc;">👥 Players: ${playerCount}</div>` : ''}
      ${mineCount !== undefined ? `<div style="font-size: 14px; color: #ffd43b;">💣 Mines: ${mineCount}</div>` : ''}
    </div>
    <div style="background: rgba(0,0,0,0.7); padding: 12px; border-radius: 8px; font-size: 13px; line-height: 1.4;">
      <div style="font-weight: bold; margin-bottom: 5px;">🎮 <strong>Tank Controls:</strong></div>
      <div>• <strong>↑:</strong> Move forward</div>
      <div>• <strong>↓:</strong> Move backward</div>
      <div>• <strong>←:</strong> Turn tank left</div>
      <div>• <strong>→:</strong> Turn tank right</div>
      <div>• <strong>Mouse:</strong> Aim cannon</div>
      <div>• <strong>Left Click:</strong> Shoot</div>
      <div>• <strong>Spacebar:</strong> Place mine</div>
    </div>
  `;
}