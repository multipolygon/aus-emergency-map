<script src="./checkbox-toggles.mjs"></script>

<template>
  <span class="show-all">
    <span class="mdi mdi-playlist-check" v-on:click.prevent="click(true)">&nbsp;</span>
    <span class="mdi mdi-playlist-remove" v-on:click.prevent="click(false)"></span>
  </span>
</template>
