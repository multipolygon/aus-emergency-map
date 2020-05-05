<script src="./checkbox-toggles.mjs"></script>

<template>
    <span class="show-all">
        <span class="mdi mdi-playlist-check" @click.prevent="click(true)">&nbsp;</span>
        <span class="mdi mdi-playlist-remove" @click.prevent="click(false)"></span>
    </span>
</template>
