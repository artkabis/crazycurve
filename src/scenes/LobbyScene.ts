import type { PlayerInfo } from '../network/protocol.ts';

export class LobbyScene {
  private readonly el: HTMLDivElement;
  private readonly playerList: HTMLElement;

  constructor(roomId: string, onCancel: () => void) {
    this.el = document.createElement('div');
    this.el.className = 'overlay lobby';
    this.el.innerHTML = `
      <h2>WAITING FOR PLAYERS</h2>
      <div class="room-code-box">
        <p class="room-code-label">ROOM CODE</p>
        <p class="room-code-value">${roomId}</p>
        <p class="room-code-hint">share with friends to join</p>
      </div>
      <ul class="player-list" id="cc-players"></ul>
      <p class="hint">Game starts automatically when 2+ players join</p>
      <button class="btn-action" id="cc-cancel">✕ &nbsp;CANCEL</button>
    `;
    this.playerList = this.el.querySelector('#cc-players')!;
    this.el.querySelector('#cc-cancel')!.addEventListener('click', onCancel);
  }

  addPlayer(player: PlayerInfo): void {
    const li = document.createElement('li');
    li.id = `player-${player.id}`;
    li.style.color = player.colorHex;
    li.textContent = `● ${player.name}`;
    this.playerList.appendChild(li);
  }

  removePlayer(playerId: number): void {
    this.el.querySelector(`#player-${playerId}`)?.remove();
  }

  mount(parent: HTMLElement): void {
    parent.appendChild(this.el);
  }

  unmount(): void {
    this.el.remove();
  }
}
