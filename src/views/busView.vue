<script setup lang="ts">
import busCabin from '../components/busCabin.vue'
import animalFace from '../components/animalFace.vue'
import { helperLines, stationTaskText, STOP_NAMES } from '../logic/busRoute'
import { currentStation, onboardCount, type BusPlay } from '../logic/busMove'

const props = defineProps<{
  play: BusPlay
  speakFail: string
}>()

const emit = defineEmits<{
  wait: [id: string]
  seat: [index: number]
  off: [id: string]
  undo: []
  resetStop: []
  depart: []
  helper: []
  speak: []
}>()

function station() {
  return currentStation(props.play)
}

function task() {
  const stop = station()
  return stationTaskText(stop.name, stop.target)
}

function helper() {
  return helperLines(onboardCount(props.play.seats), station().target).text
}
</script>

<template>
  <section class="bus">
    <ol class="route" aria-label="路线">
      <li
        v-for="(name, index) in STOP_NAMES"
        :key="name"
        :class="{ on: index === play.stationIndex, done: index < play.stationIndex }"
      >
        {{ name }}
      </li>
    </ol>

    <div class="sign">
      <p>{{ task() }}</p>
      <button type="button" class="horn" aria-label="朗读任务" @click="emit('speak')">喇叭</button>
    </div>
    <p v-if="speakFail" class="nudge">{{ speakFail }}</p>

    <div v-if="station().kind === 'board'" class="yard">
      <p>候车</p>
      <div class="row">
        <button
          v-for="animal in play.waiting"
          :key="animal.id"
          type="button"
          class="critter"
          :data-waiting="animal.id"
          aria-label="候车小动物"
          @click="emit('wait', animal.id)"
        >
          <animal-face :kind="animal.kind" :tint="animal.tint" />
        </button>
      </div>
    </div>
    <p v-else class="yard-note">本站下车</p>

    <bus-cabin :seats="play.seats" :moving="play.moving" @seat="emit('seat', $event)" />

    <div v-if="station().kind === 'alight' && play.offArea.length" class="yard">
      <p>刚下车</p>
      <div class="row">
        <button
          v-for="animal in play.offArea"
          :key="animal.id"
          type="button"
          class="critter"
          :data-off="animal.id"
          aria-label="刚下车的小动物"
          @click="emit('off', animal.id)"
        >
          <animal-face :kind="animal.kind" :tint="animal.tint" />
        </button>
      </div>
    </div>

    <p v-if="play.feedback === 'few'" class="nudge">少了</p>
    <p v-else-if="play.feedback === 'many'" class="nudge">多了</p>

    <button type="button" class="ghost" @click="emit('helper')">
      {{ play.helperOpen ? '收起小帮手' : '小帮手' }}
    </button>
    <p v-if="play.helperOpen" class="helper">{{ helper() }}</p>

    <div class="actions">
      <button type="button" class="ghost" :disabled="play.moving || play.stack.length === 0" @click="emit('undo')">
        撤回
      </button>
      <button type="button" class="ghost" :disabled="play.moving" @click="emit('resetStop')">本站重来</button>
      <button
        type="button"
        class="go"
        :disabled="play.moving || play.departLocked"
        @click="emit('depart')"
      >
        发车
      </button>
    </div>
  </section>
</template>

<style scoped>
.bus {
  display: grid;
  gap: 10px;
}

.route {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.route li {
  min-height: 44px;
  display: grid;
  place-items: center;
  padding: 4px 2px;
  border: 3px solid var(--line);
  border-radius: 12px;
  background: var(--paper);
  font-size: 0.78rem;
  font-weight: 800;
  text-align: center;
}

.route li.on {
  background: var(--teal);
  color: #fff;
}

.route li.done {
  background: #cfeee9;
}

.sign {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 10px 12px;
  border: 3px solid var(--line);
  border-radius: 16px;
  background: var(--paper);
  font-weight: 800;
}

.sign p,
.nudge,
.helper,
.yard p,
.yard-note {
  margin: 0;
}

.horn,
.ghost,
.go,
.critter {
  min-height: 48px;
  border: 3px solid var(--line);
  border-radius: 14px;
  background: var(--paper);
  font-weight: 800;
}

.horn,
.critter {
  min-width: 48px;
  padding: 4px;
}

.nudge {
  color: var(--coral);
  font-weight: 800;
  text-align: center;
}

.helper {
  padding: 10px 12px;
  border: 3px solid var(--line);
  border-radius: 16px;
  background: var(--paper);
  font-weight: 700;
}

.yard p,
.yard-note {
  font-weight: 800;
  color: var(--muted);
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.go {
  grid-column: 1 / -1;
  min-height: 56px;
  background: var(--teal);
  color: #fff;
}

button:disabled {
  opacity: 0.4;
}
</style>
