<script setup lang="ts">
import type { AnimalKind, AnimalTint } from '../logic/busRoute'

const props = defineProps<{
  kind: AnimalKind
  tint: AnimalTint
  size?: number
}>()

const fills: Record<AnimalTint, string> = {
  teal: '#2a9d8f',
  coral: '#e76f51',
  gold: '#f4a261',
  cream: '#fff3d6',
}
</script>

<template>
  <svg
    class="face"
    :width="props.size ?? 40"
    :height="props.size ?? 40"
    viewBox="0 0 40 40"
    aria-hidden="true"
  >
    <g v-if="kind === 'cat'">
      <polygon points="8,18 4,4 16,12" :fill="fills[tint]" stroke="#3b2a1a" stroke-width="2" />
      <polygon points="32,18 36,4 24,12" :fill="fills[tint]" stroke="#3b2a1a" stroke-width="2" />
      <circle cx="20" cy="22" r="13" :fill="fills[tint]" stroke="#3b2a1a" stroke-width="2.4" />
      <circle cx="15" cy="21" r="2.1" fill="#3b2a1a" />
      <circle cx="25" cy="21" r="2.1" fill="#3b2a1a" />
      <path d="M18 26 q2 3 4 0" fill="none" stroke="#3b2a1a" stroke-width="1.8" stroke-linecap="round" />
    </g>
    <g v-else-if="kind === 'rabbit'">
      <ellipse cx="13" cy="8" rx="4" ry="10" :fill="fills[tint]" stroke="#3b2a1a" stroke-width="2" />
      <ellipse cx="27" cy="8" rx="4" ry="10" :fill="fills[tint]" stroke="#3b2a1a" stroke-width="2" />
      <circle cx="20" cy="24" r="12" :fill="fills[tint]" stroke="#3b2a1a" stroke-width="2.4" />
      <circle cx="16" cy="23" r="2" fill="#3b2a1a" />
      <circle cx="24" cy="23" r="2" fill="#3b2a1a" />
      <ellipse cx="20" cy="27" rx="2" ry="1.4" fill="#e76f51" />
    </g>
    <g v-else-if="kind === 'bear'">
      <circle cx="10" cy="12" r="6" :fill="fills[tint]" stroke="#3b2a1a" stroke-width="2" />
      <circle cx="30" cy="12" r="6" :fill="fills[tint]" stroke="#3b2a1a" stroke-width="2" />
      <circle cx="20" cy="22" r="13" :fill="fills[tint]" stroke="#3b2a1a" stroke-width="2.4" />
      <circle cx="15" cy="20" r="2.1" fill="#3b2a1a" />
      <circle cx="25" cy="20" r="2.1" fill="#3b2a1a" />
      <ellipse cx="20" cy="26" rx="4" ry="3" fill="#fffdf8" stroke="#3b2a1a" stroke-width="1.6" />
    </g>
    <g v-else-if="kind === 'bird'">
      <ellipse cx="20" cy="22" rx="13" ry="11" :fill="fills[tint]" stroke="#3b2a1a" stroke-width="2.4" />
      <polygon points="32,22 40,20 32,26" fill="#f4a261" stroke="#3b2a1a" stroke-width="1.6" />
      <circle cx="16" cy="20" r="2.2" fill="#3b2a1a" />
      <path d="M8 16 q6 -8 12 -2" fill="none" stroke="#3b2a1a" stroke-width="2" />
    </g>
    <g v-else>
      <circle cx="13" cy="12" r="5" :fill="fills[tint]" stroke="#3b2a1a" stroke-width="2" />
      <circle cx="27" cy="12" r="5" :fill="fills[tint]" stroke="#3b2a1a" stroke-width="2" />
      <ellipse cx="20" cy="24" rx="13" ry="11" :fill="fills[tint]" stroke="#3b2a1a" stroke-width="2.4" />
      <circle cx="13" cy="12" r="1.7" fill="#3b2a1a" />
      <circle cx="27" cy="12" r="1.7" fill="#3b2a1a" />
      <path d="M15 26 q5 4 10 0" fill="none" stroke="#3b2a1a" stroke-width="1.8" stroke-linecap="round" />
    </g>
  </svg>
</template>
