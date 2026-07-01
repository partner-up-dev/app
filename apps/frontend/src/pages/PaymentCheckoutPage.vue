<template>
  <PaymentCheckoutFlow :bill-line-id="billLineId" />
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { readPaymentCheckoutBillLineId } from "@/domains/commerce/routing/payment-checkout-route";
import PaymentCheckoutFlow from "@/domains/payment/ui/surfaces/PaymentCheckoutFlow.vue";

const route = useRoute();

const billLineId = computed(() => readPaymentCheckoutBillLineId(route.query));
</script>
