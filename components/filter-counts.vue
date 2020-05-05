<script src="./filter-counts.mjs"></script>

<template>
    <span>
        <small v-if="obj._count" :class="'badge feature-' + cls">{{ obj._count }}</small>
        <small v-if="count_hidden" :class="'badge ghost'">{{ count_hidden }}</small>
        <small v-if="resources && obj._resources" class="badge feature-resources">{{
            obj._resources
        }}</small>
    </span>
</template>
