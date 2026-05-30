<template>
  <AdminPageScaffold class="page">
    <template #navigation>
      <AdminNavigationPanel show-logout @logout="logout" />
    </template>

    <template #actions>
      <Button appearance="pill" tone="outline" size="sm" type="button" @click="prepareNewSpu">
        {{ t("adminCommerceProducts.newSpuAction") }}
      </Button>
      <Button
        appearance="pill"
        tone="outline"
        size="sm"
        type="button"
        :disabled="selectedSpuId === null"
        @click="prepareNewSku"
      >
        {{ t("adminCommerceProducts.newSkuAction") }}
      </Button>
    </template>

    <template #rail>
      <AdminRailPanel :title="t('adminCommerceProducts.spusTitle')">
        <div v-if="products.length === 0" class="hint">
          {{ t("adminCommerceProducts.emptyProducts") }}
        </div>
        <div v-else class="selection-list">
          <ChoiceCard
            v-for="product in products"
            :key="product.spu.id"
            :active="selectedSpuId === product.spu.id && !isCreatingSpu"
            @click="selectSpu(product.spu.id)"
          >
            <span>{{ product.spu.name }}</span>
            <small>{{ product.spu.productType }} · {{ product.spu.status }}</small>
          </ChoiceCard>
        </div>
      </AdminRailPanel>

      <AdminRailPanel
        v-if="selectedProduct"
        :title="t('adminCommerceProducts.skusTitle')"
      >
        <div v-if="selectedProduct.skus.length === 0" class="hint">
          {{ t("adminCommerceProducts.emptySkus") }}
        </div>
        <div v-else class="selection-list">
          <ChoiceCard
            v-for="record in selectedProduct.skus"
            :key="record.sku.id"
            :active="selectedSkuId === record.sku.id && !isCreatingSku"
            @click="selectSku(record.sku.id)"
          >
            <span>{{ record.sku.name }}</span>
            <small>#{{ record.sku.sortOrder }} · {{ record.sku.status }}</small>
          </ChoiceCard>
        </div>
      </AdminRailPanel>
    </template>

    <template #main>
      <div class="stack">
        <LoadingIndicator
          v-if="workspaceQuery.isLoading.value"
          :message="t('common.loading')"
        />
        <ErrorToast
          v-else-if="workspaceQuery.error.value"
          :message="workspaceQuery.error.value.message"
          persistent
        />
        <template v-else>
          <BentoItem
            :title="isCreatingSpu ? t('adminCommerceProducts.createSpuTitle') : t('adminCommerceProducts.editSpuTitle')"
            :description="t('adminCommerceProducts.spuHint')"
            span="full"
          >
            <div class="form-stack">
              <section class="editor-section">
                <h3 class="section-title">{{ t("adminCommerceProducts.basicInfoTitle") }}</h3>
                <div class="grid">
                  <label class="field">
                    <span class="field-label">{{ t("adminCommerceProducts.spuNameLabel") }}</span>
                    <input v-model="spuForm.name" class="field-input" type="text" />
                  </label>

                  <label class="field">
                    <span class="field-label">{{ t("adminCommerceProducts.productTypeLabel") }}</span>
                    <select v-model="spuForm.productType" class="field-input">
                      <option value="RENTAL">RENTAL</option>
                      <option value="RIDE_HAILING">RIDE_HAILING</option>
                    </select>
                  </label>

                  <label class="field">
                    <span class="field-label">{{ t("adminCommerceProducts.statusLabel") }}</span>
                    <select v-model="spuForm.status" class="field-input">
                      <option value="DRAFT">DRAFT</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="ARCHIVED">ARCHIVED</option>
                    </select>
                  </label>
                </div>
              </section>

              <section class="editor-section">
                <h3 class="section-title">{{ t("adminCommerceProducts.salesPolicyLabel") }}</h3>
                <div class="grid">
                  <label class="field">
                    <span class="field-label">{{ t("adminCommerceProducts.quantityPolicyLabel") }}</span>
                    <select v-model="spuForm.quantityPolicyType" class="field-input">
                      <option value="FIXED">{{ t("adminCommerceProducts.quantityPolicyFixed") }}</option>
                      <option value="PER_PARTICIPANT">{{ t("adminCommerceProducts.quantityPolicyPerParticipant") }}</option>
                      <option value="USER_SELECTED">{{ t("adminCommerceProducts.quantityPolicyUserSelected") }}</option>
                    </select>
                  </label>

                  <label v-if="spuForm.quantityPolicyType === 'FIXED'" class="field">
                    <span class="field-label">{{ t("adminCommerceProducts.fixedQuantityLabel") }}</span>
                    <input v-model.number="spuForm.fixedQuantity" class="field-input" type="number" min="1" />
                  </label>

                  <template v-if="spuForm.quantityPolicyType === 'USER_SELECTED'">
                    <label class="field">
                      <span class="field-label">{{ t("adminCommerceProducts.minQuantityLabel") }}</span>
                      <input v-model.number="spuForm.userSelectedMin" class="field-input" type="number" min="0" />
                    </label>
                    <label class="field">
                      <span class="field-label">{{ t("adminCommerceProducts.maxQuantityLabel") }}</span>
                      <input v-model.number="spuForm.userSelectedMax" class="field-input" type="number" min="1" />
                    </label>
                  </template>
                </div>
              </section>

              <section class="editor-section">
                <h3 class="section-title">{{ t("adminCommerceProducts.servicePolicyLabel") }}</h3>
                <div v-if="spuForm.productType === 'RENTAL'" class="grid">
                  <label class="field">
                    <span class="field-label">{{ t("adminCommerceProducts.serviceRentalLeadTimeLabel") }}</span>
                    <input
                      v-model.number="spuForm.rentalBookingLeadTimeMinutes"
                      class="field-input"
                      type="number"
                      min="0"
                    />
                  </label>
                  <div class="toggle-grid field--full">
                    <ToggleSwitch
                      v-model="spuForm.rentalRequiresContactPhone"
                      :label="t('adminCommerceProducts.requiresContactPhoneLabel')"
                    />
                    <ToggleSwitch
                      v-model="spuForm.rentalRequiresRealName"
                      :label="t('adminCommerceProducts.requiresRealNameLabel')"
                    />
                    <ToggleSwitch
                      v-model="spuForm.rentalRequiresNationalId"
                      :label="t('adminCommerceProducts.requiresNationalIdLabel')"
                    />
                  </div>
                </div>
                <p v-else class="hint">{{ t("adminCommerceProducts.rideHailingServicePolicyHint") }}</p>
              </section>

              <section class="editor-section">
                <div class="section-header">
                  <h3 class="section-title">{{ t("adminCommerceProducts.pricingPolicyLabel") }}</h3>
                  <Button appearance="pill" tone="outline" size="sm" type="button" @click="addSpuPricingRule">
                    <template #leading>
                      <span class="i-mdi-plus" />
                    </template>
                    {{ t("adminCommerceProducts.pricingRuleAddAction") }}
                  </Button>
                </div>
                <p v-if="spuForm.pricingRules.length === 0" class="hint">
                  {{ t("adminCommerceProducts.emptyPricingRules") }}
                </p>
                <article
                  v-for="(rule, index) in spuForm.pricingRules"
                  :key="rule.draftId"
                  class="repeated-item"
                >
                  <div class="section-header">
                    <strong>{{ t("adminCommerceProducts.pricingRuleTitle", { index: index + 1 }) }}</strong>
                    <Button appearance="pill" tone="danger" size="sm" type="button" @click="removeSpuPricingRule(index)">
                      <template #leading>
                        <span class="i-mdi-delete-outline" />
                      </template>
                      {{ t("adminCommerceProducts.removeItemAction") }}
                    </Button>
                  </div>
                  <div class="grid">
                    <label class="field">
                      <span class="field-label">{{ t("adminCommerceProducts.pricingRuleIdLabel") }}</span>
                      <input v-model.number="rule.id" class="field-input" type="number" />
                    </label>
                    <label class="field">
                      <span class="field-label">{{ t("adminCommerceProducts.pricingRuleLabelLabel") }}</span>
                      <input v-model="rule.label" class="field-input" type="text" />
                    </label>
                    <label class="field field--full">
                      <span class="field-label">{{ t("adminCommerceProducts.pricingRuleDescriptionLabel") }}</span>
                      <input v-model="rule.description" class="field-input" type="text" />
                    </label>
                    <label class="field">
                      <span class="field-label">{{ t("adminCommerceProducts.pricingRuleConditionLabel") }}</span>
                      <select v-model="rule.conditionMode" class="field-input">
                        <option value="ALWAYS">{{ t("adminCommerceProducts.pricingRuleConditionAlways") }}</option>
                        <option value="PRESERVE" :disabled="rule.conditionRule === null">
                          {{ t("adminCommerceProducts.pricingRuleConditionCustom") }}
                        </option>
                      </select>
                    </label>
                    <p v-if="rule.conditionMode === 'PRESERVE'" class="hint field--full">
                      {{ t("adminCommerceProducts.pricingRuleCustomConditionHint") }}
                    </p>
                    <label class="field">
                      <span class="field-label">{{ t("adminCommerceProducts.pricingRuleActionLabel") }}</span>
                      <select v-model="rule.actionType" class="field-input">
                        <option value="MINUS">{{ t("adminCommerceProducts.pricingRuleActionMinus") }}</option>
                        <option value="RATIO">{{ t("adminCommerceProducts.pricingRuleActionRatio") }}</option>
                        <option value="RESET">{{ t("adminCommerceProducts.pricingRuleActionReset") }}</option>
                      </select>
                    </label>
                    <label v-if="rule.actionType === 'MINUS'" class="field">
                      <span class="field-label">{{ t("adminCommerceProducts.amountFenLabel") }}</span>
                      <input v-model.number="rule.amountFen" class="field-input" type="number" />
                    </label>
                    <label v-if="rule.actionType === 'RATIO'" class="field">
                      <span class="field-label">{{ t("adminCommerceProducts.ratioBpsLabel") }}</span>
                      <input v-model.number="rule.ratioBps" class="field-input" type="number" min="0" />
                    </label>
                    <template v-if="rule.actionType === 'RESET'">
                      <label class="field">
                        <span class="field-label">{{ t("adminCommerceProducts.pricingModelTypeLabel") }}</span>
                        <select v-model="rule.resetPricingModelMode" class="field-input">
                          <option value="FIXED_TOTAL">{{ t("adminCommerceProducts.pricingModelFixed") }}</option>
                          <option v-if="rule.resetPricingModel !== null" value="PRESERVE">
                            {{ t("adminCommerceProducts.pricingModelDynamicPreserved") }}
                          </option>
                        </select>
                      </label>
                      <label v-if="rule.resetPricingModelMode === 'FIXED_TOTAL'" class="field">
                        <span class="field-label">{{ t("adminCommerceProducts.resetAmountFenLabel") }}</span>
                        <input v-model.number="rule.resetAmountFen" class="field-input" type="number" min="0" />
                      </label>
                      <p v-else class="hint field--full">
                        {{ t("adminCommerceProducts.dynamicPricingPreservedHint") }}
                      </p>
                    </template>
                    <label class="field">
                      <span class="field-label">{{ t("adminCommerceProducts.targetSkuIdLabel") }}</span>
                      <input v-model="rule.targetSkuIdText" class="field-input" type="text" />
                    </label>
                    <ToggleSwitch
                      v-model="rule.continue"
                      :label="t('adminCommerceProducts.continueRuleLabel')"
                    />
                  </div>
                </article>
              </section>

              <section class="editor-section">
                <h3 class="section-title">{{ t("adminCommerceProducts.presentationLabel") }}</h3>
                <StringListEditor
                  v-model="spuForm.heroImageAssetIds"
                  :title="t('adminCommerceProducts.heroImageAssetsLabel')"
                  :add-label="t('adminCommerceProducts.addItemAction')"
                  :remove-label="t('adminCommerceProducts.removeItemAction')"
                />
                <StringListEditor
                  v-model="spuForm.detailImageAssetIds"
                  :title="t('adminCommerceProducts.detailImageAssetsLabel')"
                  :add-label="t('adminCommerceProducts.addItemAction')"
                  :remove-label="t('adminCommerceProducts.removeItemAction')"
                />
                <StringListEditor
                  v-model="spuForm.sellingPoints"
                  :title="t('adminCommerceProducts.sellingPointsLabel')"
                  :add-label="t('adminCommerceProducts.addItemAction')"
                  :remove-label="t('adminCommerceProducts.removeItemAction')"
                />

                <div class="section-header">
                  <h4 class="subsection-title">{{ t("adminCommerceProducts.parameterGroupsLabel") }}</h4>
                  <Button appearance="pill" tone="outline" size="sm" type="button" @click="addParameterGroup">
                    <template #leading>
                      <span class="i-mdi-plus" />
                    </template>
                    {{ t("adminCommerceProducts.addParameterGroupAction") }}
                  </Button>
                </div>
                <p v-if="spuForm.parameterGroups.length === 0" class="hint">
                  {{ t("adminCommerceProducts.emptyListPlaceholder") }}
                </p>
                <article
                  v-for="(group, groupIndex) in spuForm.parameterGroups"
                  :key="group.id"
                  class="repeated-item"
                >
                  <div class="section-header">
                    <strong>{{ t("adminCommerceProducts.parameterGroupTitle", { index: groupIndex + 1 }) }}</strong>
                    <Button appearance="pill" tone="danger" size="sm" type="button" @click="removeParameterGroup(groupIndex)">
                      <template #leading>
                        <span class="i-mdi-delete-outline" />
                      </template>
                      {{ t("adminCommerceProducts.removeItemAction") }}
                    </Button>
                  </div>
                  <label class="field">
                    <span class="field-label">{{ t("adminCommerceProducts.groupTitleLabel") }}</span>
                    <input v-model="group.title" class="field-input" type="text" />
                  </label>
                  <div class="section-header">
                    <span class="field-label">{{ t("adminCommerceProducts.parameterItemsLabel") }}</span>
                    <Button appearance="pill" tone="outline" size="sm" type="button" @click="addParameterItem(groupIndex)">
                      <template #leading>
                        <span class="i-mdi-plus" />
                      </template>
                      {{ t("adminCommerceProducts.addParameterItemAction") }}
                    </Button>
                  </div>
                  <div
                    v-for="(item, itemIndex) in group.items"
                    :key="item.id"
                    class="inline-row"
                  >
                    <label class="field">
                      <span class="field-label">{{ t("adminCommerceProducts.parameterLabelLabel") }}</span>
                      <input v-model="item.label" class="field-input" type="text" />
                    </label>
                    <label class="field">
                      <span class="field-label">{{ t("adminCommerceProducts.parameterValueLabel") }}</span>
                      <input v-model="item.value" class="field-input" type="text" />
                    </label>
                    <Button appearance="pill" tone="danger" size="sm" type="button" @click="removeParameterItem(groupIndex, itemIndex)">
                      <template #leading>
                        <span class="i-mdi-close" />
                      </template>
                      {{ t("adminCommerceProducts.removeItemAction") }}
                    </Button>
                  </div>
                </article>

                <div class="section-header">
                  <h4 class="subsection-title">{{ t("adminCommerceProducts.noticeBlocksLabel") }}</h4>
                  <Button appearance="pill" tone="outline" size="sm" type="button" @click="addNoticeBlock">
                    <template #leading>
                      <span class="i-mdi-plus" />
                    </template>
                    {{ t("adminCommerceProducts.addNoticeBlockAction") }}
                  </Button>
                </div>
                <p v-if="spuForm.noticeBlocks.length === 0" class="hint">
                  {{ t("adminCommerceProducts.emptyListPlaceholder") }}
                </p>
                <article
                  v-for="(notice, index) in spuForm.noticeBlocks"
                  :key="notice.id"
                  class="repeated-item"
                >
                  <div class="section-header">
                    <strong>{{ t("adminCommerceProducts.noticeBlockTitle", { index: index + 1 }) }}</strong>
                    <Button appearance="pill" tone="danger" size="sm" type="button" @click="removeNoticeBlock(index)">
                      <template #leading>
                        <span class="i-mdi-delete-outline" />
                      </template>
                      {{ t("adminCommerceProducts.removeItemAction") }}
                    </Button>
                  </div>
                  <div class="grid">
                    <label class="field">
                      <span class="field-label">{{ t("adminCommerceProducts.noticeTitleLabel") }}</span>
                      <input v-model="notice.title" class="field-input" type="text" />
                    </label>
                    <label class="field field--full">
                      <span class="field-label">{{ t("adminCommerceProducts.noticeContentLabel") }}</span>
                      <textarea v-model="notice.content" class="field-input field-textarea"></textarea>
                    </label>
                  </div>
                </article>
              </section>

              <section class="editor-section">
                <div class="section-header">
                  <h3 class="section-title">{{ t("adminCommerceProducts.factsLabel") }}</h3>
                  <Button appearance="pill" tone="outline" size="sm" type="button" @click="addSpuFact">
                    <template #leading>
                      <span class="i-mdi-plus" />
                    </template>
                    {{ t("adminCommerceProducts.addFactAction") }}
                  </Button>
                </div>
                <p v-if="spuForm.facts.length === 0" class="hint">
                  {{ t("adminCommerceProducts.emptyListPlaceholder") }}
                </p>
                <FactEntryEditor
                  v-for="(fact, index) in spuForm.facts"
                  :key="fact.id"
                  v-model="spuForm.facts[index]"
                  :remove-label="t('adminCommerceProducts.removeItemAction')"
                  @remove="removeSpuFact(index)"
                />
              </section>

              <div class="inline-actions">
                <Button size="sm" type="button" :disabled="isSavingSpu" @click="handleSaveSpu">
                  {{ isSavingSpu ? t("adminCommerceProducts.savingAction") : t("adminCommerceProducts.saveSpuAction") }}
                </Button>
              </div>
            </div>
          </BentoItem>

          <BentoItem
            :title="isCreatingSku ? t('adminCommerceProducts.createSkuTitle') : t('adminCommerceProducts.editSkuTitle')"
            :description="t('adminCommerceProducts.skuHint')"
            span="full"
          >
            <div v-if="selectedSpuId === null && !isCreatingSku" class="hint">
              {{ t("adminCommerceProducts.selectSpuHint") }}
            </div>
            <div v-else class="form-stack">
              <section class="editor-section">
                <h3 class="section-title">{{ t("adminCommerceProducts.basicInfoTitle") }}</h3>
                <div class="grid">
                  <label class="field">
                    <span class="field-label">{{ t("adminCommerceProducts.skuNameLabel") }}</span>
                    <input v-model="skuForm.name" class="field-input" type="text" />
                  </label>

                  <label class="field">
                    <span class="field-label">{{ t("adminCommerceProducts.statusLabel") }}</span>
                    <select v-model="skuForm.status" class="field-input">
                      <option value="DRAFT">DRAFT</option>
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="ARCHIVED">ARCHIVED</option>
                    </select>
                  </label>

                  <label class="field">
                    <span class="field-label">{{ t("adminCommerceProducts.sortOrderLabel") }}</span>
                    <input v-model.number="skuForm.sortOrder" class="field-input" type="number" />
                  </label>
                </div>
              </section>

              <section class="editor-section">
                <h3 class="section-title">{{ t("adminCommerceProducts.skuFactsLabel") }}</h3>
                <div v-if="selectedProductType === 'RENTAL'" class="grid">
                  <label class="field">
                    <span class="field-label">{{ t("adminCommerceProducts.zoneCodeLabel") }}</span>
                    <input v-model="skuForm.rentalZoneCode" class="field-input" type="text" />
                  </label>
                  <label class="field">
                    <span class="field-label">{{ t("adminCommerceProducts.participantCountLabel") }}</span>
                    <input v-model.number="skuForm.rentalParticipantCount" class="field-input" type="number" min="1" />
                  </label>
                  <label class="field">
                    <span class="field-label">{{ t("adminCommerceProducts.durationMinutesLabel") }}</span>
                    <input v-model.number="skuForm.rentalDurationMinutes" class="field-input" type="number" min="1" />
                  </label>
                </div>
                <div v-else class="grid">
                  <label class="field">
                    <span class="field-label">{{ t("adminCommerceProducts.vehicleClassLabel") }}</span>
                    <input v-model="skuForm.rideVehicleClass" class="field-input" type="text" />
                  </label>
                </div>
              </section>

              <section class="editor-section">
                <h3 class="section-title">{{ t("adminCommerceProducts.pricingModelLabel") }}</h3>
                <div class="grid">
                  <label class="field">
                    <span class="field-label">{{ t("adminCommerceProducts.pricingModelTypeLabel") }}</span>
                    <select v-model="skuForm.pricingModelType" class="field-input">
                      <option value="FIXED_TOTAL">{{ t("adminCommerceProducts.pricingModelFixed") }}</option>
                      <option v-if="skuForm.dynamicPricingModel !== null" value="DYNAMIC_QUOTE">
                        {{ t("adminCommerceProducts.pricingModelDynamicPreserved") }}
                      </option>
                    </select>
                  </label>
                  <label v-if="skuForm.pricingModelType === 'FIXED_TOTAL'" class="field">
                    <span class="field-label">{{ t("adminCommerceProducts.amountFenLabel") }}</span>
                    <input v-model.number="skuForm.fixedAmountFen" class="field-input" type="number" min="0" />
                  </label>
                </div>
                <p v-if="skuForm.pricingModelType === 'DYNAMIC_QUOTE'" class="hint">
                  {{ t("adminCommerceProducts.dynamicPricingPreservedHint") }}
                </p>
              </section>

              <div class="inline-actions">
                <Button
                  size="sm"
                  type="button"
                  :disabled="isSavingSku || selectedSpuId === null"
                  @click="handleSaveSku"
                >
                  {{ isSavingSku ? t("adminCommerceProducts.savingAction") : t("adminCommerceProducts.saveSkuAction") }}
                </Button>
              </div>
            </div>
          </BentoItem>

          <BentoItem
            :title="t('adminCommerceProducts.cancellationPolicyTitle')"
            :description="t('adminCommerceProducts.cancellationPolicyHint')"
            span="full"
          >
            <div v-if="selectedSkuId === null" class="hint">
              {{ t("adminCommerceProducts.selectSkuHint") }}
            </div>
            <div v-else class="form-stack">
              <label class="field">
                <span class="field-label">{{ t("adminCommerceProducts.operatorBufferMinutesLabel") }}</span>
                <input
                  v-model.number="policyForm.operatorBufferMinutes"
                  class="field-input"
                  type="number"
                  min="0"
                />
              </label>

              <section class="editor-section">
                <div class="section-header">
                  <h3 class="section-title">{{ t("adminCommerceProducts.cancellationTiersLabel") }}</h3>
                  <Button appearance="pill" tone="outline" size="sm" type="button" @click="addCancellationTier">
                    <template #leading>
                      <span class="i-mdi-plus" />
                    </template>
                    {{ t("adminCommerceProducts.addCancellationTierAction") }}
                  </Button>
                </div>
                <article
                  v-for="(tier, index) in policyForm.tiers"
                  :key="tier.id"
                  class="repeated-item"
                >
                  <div class="section-header">
                    <strong>{{ t("adminCommerceProducts.cancellationTierTitle", { index: index + 1 }) }}</strong>
                    <Button
                      appearance="pill"
                      tone="danger"
                      size="sm"
                      type="button"
                      :disabled="policyForm.tiers.length <= 1"
                      @click="removeCancellationTier(index)"
                    >
                      <template #leading>
                        <span class="i-mdi-delete-outline" />
                      </template>
                      {{ t("adminCommerceProducts.removeItemAction") }}
                    </Button>
                  </div>
                  <div class="grid">
                    <label class="field">
                      <span class="field-label">{{ t("adminCommerceProducts.tierCodeLabel") }}</span>
                      <input v-model="tier.code" class="field-input" type="text" />
                    </label>
                    <label class="field">
                      <span class="field-label">{{ t("adminCommerceProducts.visibleLabelLabel") }}</span>
                      <input v-model="tier.visibleLabel" class="field-input" type="text" />
                    </label>
                    <label class="field">
                      <span class="field-label">{{ t("adminCommerceProducts.tierFromLabel") }}</span>
                      <input v-model="tier.fromMinutesBeforeStartText" class="field-input" type="text" />
                    </label>
                    <label class="field">
                      <span class="field-label">{{ t("adminCommerceProducts.tierUntilLabel") }}</span>
                      <input v-model="tier.untilMinutesBeforeStartText" class="field-input" type="text" />
                    </label>
                    <label class="field">
                      <span class="field-label">{{ t("adminCommerceProducts.refundPercentLabel") }}</span>
                      <input v-model.number="tier.refundPercent" class="field-input" type="number" min="0" max="100" />
                    </label>
                    <ToggleSwitch
                      v-model="tier.requiresOperatorHandling"
                      :label="t('adminCommerceProducts.requiresOperatorHandlingLabel')"
                    />
                  </div>
                </article>
              </section>

              <div class="inline-actions">
                <Button size="sm" type="button" :disabled="isSavingPolicy" @click="handleSavePolicy">
                  {{ isSavingPolicy ? t("adminCommerceProducts.savingAction") : t("adminCommerceProducts.savePolicyAction") }}
                </Button>
              </div>
            </div>
          </BentoItem>

          <ErrorToast
            v-if="pageErrorMessage"
            :message="pageErrorMessage"
            @close="clearErrors"
          />
        </template>
      </div>
    </template>
  </AdminPageScaffold>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, ref, watch, type PropType } from "vue";
import { useI18n } from "vue-i18n";
import AdminPageScaffold from "@/domains/admin/ui/layout/AdminPageScaffold.vue";
import AdminRailPanel from "@/domains/admin/ui/layout/AdminRailPanel.vue";
import AdminNavigationPanel from "@/domains/admin/ui/navigation/AdminNavigationPanel.vue";
import BentoItem from "@/domains/admin/ui/layout/BentoItem.vue";
import { useAdminAccess } from "@/domains/admin/use-cases/useAdminAccess";
import {
  type AdminProductSkuInput,
  type AdminProductSpuInput,
  type AdminSkuCancellationPolicyInput,
  useAdminCommerceProductWorkspace,
  useCreateAdminProductSku,
  useCreateAdminProductSpu,
  useSaveAdminSkuCancellationPolicy,
  useUpdateAdminProductSku,
  useUpdateAdminProductSpu,
} from "@/domains/admin-commerce/queries/useAdminCommerce";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import Button from "@/shared/ui/actions/Button.vue";
import ChoiceCard from "@/shared/ui/containers/ChoiceCard.vue";
import ToggleSwitch from "@/shared/ui/forms/ToggleSwitch.vue";

type ProductWorkspace = NonNullable<
  ReturnType<typeof useAdminCommerceProductWorkspace>["data"]["value"]
>;
type ProductRecord = ProductWorkspace["products"][number];
type SkuRecord = ProductRecord["skus"][number];
type ProductType = AdminProductSpuInput["productType"];
type RentalServicePolicy = Extract<AdminProductSpuInput["servicePolicy"], { type: "RENTAL" }>;
type QuantityPolicyType = AdminProductSpuInput["salesPolicy"]["quantityPolicy"]["type"];
type SpuPricingRule = AdminProductSpuInput["pricingRules"][number];
type SkuPricingModel = AdminProductSkuInput["pricingModel"];
type SkuFacts = AdminProductSkuInput["facts"];

type NumberInput = number | string;
type FactValueKind = "string" | "number" | "boolean" | "null" | "preserve";
type PricingRuleConditionMode = "ALWAYS" | "PRESERVE";
type ResetPricingModelMode = "FIXED_TOTAL" | "PRESERVE";

type EditableStringItem = {
  id: string;
  value: string;
};

type ProductParameterItemDraft = {
  id: string;
  label: string;
  value: string;
};

type ProductParameterGroupDraft = {
  id: string;
  title: string;
  items: ProductParameterItemDraft[];
};

type ProductNoticeBlockDraft = {
  id: string;
  title: string;
  content: string;
};

type FactEntryDraft = {
  id: string;
  key: string;
  valueKind: FactValueKind;
  valueText: string;
  booleanValue: boolean;
  originalValue: unknown;
};

type PricingRuleDraft = {
  draftId: string;
  id: NumberInput;
  label: string;
  description: string;
  conditionMode: PricingRuleConditionMode;
  conditionRule: unknown;
  actionType: SpuPricingRule["action"]["type"];
  amountFen: NumberInput;
  ratioBps: NumberInput;
  resetPricingModelMode: ResetPricingModelMode;
  resetAmountFen: NumberInput;
  resetPricingModel: unknown;
  targetSkuIdText: string;
  continue: boolean;
};

type SpuEditorForm = {
  name: string;
  productType: ProductType;
  status: AdminProductSpuInput["status"];
  quantityPolicyType: QuantityPolicyType;
  fixedQuantity: NumberInput;
  userSelectedMin: NumberInput;
  userSelectedMax: NumberInput;
  rentalBookingLeadTimeMinutes: NumberInput;
  rentalRequiresContactPhone: boolean;
  rentalRequiresRealName: boolean;
  rentalRequiresNationalId: boolean;
  pricingRules: PricingRuleDraft[];
  heroImageAssetIds: EditableStringItem[];
  detailImageAssetIds: EditableStringItem[];
  sellingPoints: EditableStringItem[];
  parameterGroups: ProductParameterGroupDraft[];
  noticeBlocks: ProductNoticeBlockDraft[];
  facts: FactEntryDraft[];
};

type SkuEditorForm = {
  name: string;
  status: AdminProductSkuInput["status"];
  sortOrder: NumberInput;
  rentalZoneCode: string;
  rentalParticipantCount: NumberInput;
  rentalDurationMinutes: NumberInput;
  rideVehicleClass: string;
  pricingModelType: SkuPricingModel["type"];
  fixedAmountFen: NumberInput;
  dynamicPricingModel: Extract<SkuPricingModel, { type: "DYNAMIC_QUOTE" }> | null;
};

type CancellationTierDraft = {
  id: string;
  code: string;
  fromMinutesBeforeStartText: string;
  untilMinutesBeforeStartText: string;
  refundPercent: NumberInput;
  requiresOperatorHandling: boolean;
  visibleLabel: string;
};

type PolicyEditorForm = {
  operatorBufferMinutes: NumberInput;
  tiers: CancellationTierDraft[];
};

let draftIdSeed = 0;

const createDraftId = (prefix: string): string => {
  draftIdSeed += 1;
  return `${prefix}-${draftIdSeed}`;
};

const defaultRentalServicePolicy = (): RentalServicePolicy => ({
  type: "RENTAL",
  bookingLeadTimeMinutes: 1440,
  requiresContactPhone: true,
  requiresRealName: true,
  requiresNationalId: false,
});

const emptySpuInput = (): AdminProductSpuInput => ({
  name: "",
  productType: "RENTAL",
  status: "DRAFT",
  salesPolicy: {
    skuSelectionPolicy: { type: "EXACTLY_ONE" },
    quantityPolicy: { type: "FIXED", quantity: 1 },
  },
  servicePolicy: defaultRentalServicePolicy(),
  pricingRules: [],
  presentation: {
    heroImageAssetIds: [],
    detailImageAssetIds: [],
    sellingPoints: [],
    parameterGroups: [],
    noticeBlocks: [],
  },
  facts: {},
});

const emptySkuInput = (): Omit<AdminProductSkuInput, "spuId"> => ({
  name: "",
  status: "DRAFT",
  sortOrder: 0,
  facts: {
    type: "RENTAL",
    zoneCode: "",
    participantCount: 2,
    durationMinutes: 180,
  },
  pricingModel: {
    type: "FIXED_TOTAL",
    amountFen: 0,
  },
  cancellationPolicyRef: null,
});

const emptyPolicyInput = (): AdminSkuCancellationPolicyInput => ({
  operatorBufferMinutes: 30,
  tiers: [
    {
      code: "DEFAULT",
      fromMinutesBeforeStart: null,
      untilMinutesBeforeStart: null,
      refundPercent: 100,
      requiresOperatorHandling: false,
      visibleLabel: "默认全额退款",
    },
  ],
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isFixedTotalPricingModel = (
  value: unknown,
): value is Extract<SkuPricingModel, { type: "FIXED_TOTAL" }> =>
  isRecord(value) &&
  value.type === "FIXED_TOTAL" &&
  typeof value.amountFen === "number";

const isDynamicQuotePricingModel = (
  value: SkuPricingModel,
): value is Extract<SkuPricingModel, { type: "DYNAMIC_QUOTE" }> =>
  value.type === "DYNAMIC_QUOTE";

const toStringItems = (values: string[], prefix: string): EditableStringItem[] =>
  values.map((value) => ({ id: createDraftId(prefix), value }));

const buildStringList = (items: EditableStringItem[]): string[] =>
  items.map((item) => item.value.trim()).filter((value) => value.length > 0);

const toFactDrafts = (facts: Record<string, unknown>): FactEntryDraft[] =>
  Object.entries(facts).map(([key, value]) => {
    if (typeof value === "string") {
      return {
        id: createDraftId("fact"),
        key,
        valueKind: "string",
        valueText: value,
        booleanValue: false,
        originalValue: value,
      };
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return {
        id: createDraftId("fact"),
        key,
        valueKind: "number",
        valueText: String(value),
        booleanValue: false,
        originalValue: value,
      };
    }
    if (typeof value === "boolean") {
      return {
        id: createDraftId("fact"),
        key,
        valueKind: "boolean",
        valueText: "",
        booleanValue: value,
        originalValue: value,
      };
    }
    if (value === null) {
      return {
        id: createDraftId("fact"),
        key,
        valueKind: "null",
        valueText: "",
        booleanValue: false,
        originalValue: value,
      };
    }
    return {
      id: createDraftId("fact"),
      key,
      valueKind: "preserve",
      valueText: "",
      booleanValue: false,
      originalValue: value,
    };
  });

const toParameterGroups = (
  groups: AdminProductSpuInput["presentation"]["parameterGroups"],
): ProductParameterGroupDraft[] =>
  groups.map((group) => ({
    id: createDraftId("parameter-group"),
    title: group.title,
    items: group.items.map((item) => ({
      id: createDraftId("parameter-item"),
      label: item.label,
      value: item.value,
    })),
  }));

const toNoticeBlocks = (
  blocks: AdminProductSpuInput["presentation"]["noticeBlocks"],
): ProductNoticeBlockDraft[] =>
  blocks.map((block) => ({
    id: createDraftId("notice"),
    title: block.title,
    content: block.content,
  }));

const toPricingRuleDrafts = (rules: SpuPricingRule[]): PricingRuleDraft[] =>
  rules.map((rule) => {
    const resetPricingModel =
      rule.action.type === "RESET" ? rule.action.payload.pricingModel : null;
    const fixedResetModel = isFixedTotalPricingModel(resetPricingModel)
      ? resetPricingModel
      : null;
    const targetSkuId =
      rule.target.level === "SKU" && typeof rule.target.skuId === "number"
        ? String(rule.target.skuId)
        : "";

    return {
      draftId: createDraftId("pricing-rule"),
      id: rule.id,
      label: rule.label,
      description: rule.description,
      conditionMode: rule.conditionRule === null ? "ALWAYS" : "PRESERVE",
      conditionRule: rule.conditionRule,
      actionType: rule.action.type,
      amountFen: rule.action.type === "MINUS" ? rule.action.payload.amountFen : 0,
      ratioBps: rule.action.type === "RATIO" ? rule.action.payload.ratioBps : 10000,
      resetPricingModelMode: fixedResetModel ? "FIXED_TOTAL" : "PRESERVE",
      resetAmountFen: fixedResetModel?.amountFen ?? 0,
      resetPricingModel,
      targetSkuIdText: targetSkuId,
      continue: rule.continue,
    };
  });

const toSpuForm = (input: AdminProductSpuInput): SpuEditorForm => {
  const quantityPolicy = input.salesPolicy.quantityPolicy;
  const rentalPolicy =
    input.servicePolicy.type === "RENTAL"
      ? input.servicePolicy
      : defaultRentalServicePolicy();

  return {
    name: input.name,
    productType: input.productType,
    status: input.status,
    quantityPolicyType: quantityPolicy.type,
    fixedQuantity: quantityPolicy.type === "FIXED" ? quantityPolicy.quantity : 1,
    userSelectedMin: quantityPolicy.type === "USER_SELECTED" ? quantityPolicy.min : 1,
    userSelectedMax: quantityPolicy.type === "USER_SELECTED" ? quantityPolicy.max : 1,
    rentalBookingLeadTimeMinutes: rentalPolicy.bookingLeadTimeMinutes,
    rentalRequiresContactPhone: rentalPolicy.requiresContactPhone,
    rentalRequiresRealName: rentalPolicy.requiresRealName,
    rentalRequiresNationalId: rentalPolicy.requiresNationalId,
    pricingRules: toPricingRuleDrafts(input.pricingRules),
    heroImageAssetIds: toStringItems(input.presentation.heroImageAssetIds, "hero-image"),
    detailImageAssetIds: toStringItems(input.presentation.detailImageAssetIds, "detail-image"),
    sellingPoints: toStringItems(input.presentation.sellingPoints, "selling-point"),
    parameterGroups: toParameterGroups(input.presentation.parameterGroups),
    noticeBlocks: toNoticeBlocks(input.presentation.noticeBlocks),
    facts: toFactDrafts(input.facts),
  };
};

const toSkuForm = (input: Omit<AdminProductSkuInput, "spuId">): SkuEditorForm => {
  const pricingModel = input.pricingModel;
  return {
    name: input.name,
    status: input.status,
    sortOrder: input.sortOrder,
    rentalZoneCode: input.facts.type === "RENTAL" ? input.facts.zoneCode : "",
    rentalParticipantCount: input.facts.type === "RENTAL" ? input.facts.participantCount : 2,
    rentalDurationMinutes: input.facts.type === "RENTAL" ? input.facts.durationMinutes : 180,
    rideVehicleClass: input.facts.type === "RIDE_HAILING" ? input.facts.vehicleClass : "",
    pricingModelType: pricingModel.type,
    fixedAmountFen: pricingModel.type === "FIXED_TOTAL" ? pricingModel.amountFen : 0,
    dynamicPricingModel: isDynamicQuotePricingModel(pricingModel) ? pricingModel : null,
  };
};

const toPolicyForm = (
  input: AdminSkuCancellationPolicyInput,
): PolicyEditorForm => ({
  operatorBufferMinutes: input.operatorBufferMinutes,
  tiers: input.tiers.map((tier) => ({
    id: createDraftId("tier"),
    code: tier.code,
    fromMinutesBeforeStartText:
      tier.fromMinutesBeforeStart === null ? "" : String(tier.fromMinutesBeforeStart),
    untilMinutesBeforeStartText:
      tier.untilMinutesBeforeStart === null ? "" : String(tier.untilMinutesBeforeStart),
    refundPercent: tier.refundPercent,
    requiresOperatorHandling: tier.requiresOperatorHandling,
    visibleLabel: tier.visibleLabel,
  })),
});

const { t } = useI18n();
const { isAdmin, logout } = useAdminAccess();
const workspaceQuery = useAdminCommerceProductWorkspace(isAdmin);
const createSpuMutation = useCreateAdminProductSpu();
const updateSpuMutation = useUpdateAdminProductSpu();
const createSkuMutation = useCreateAdminProductSku();
const updateSkuMutation = useUpdateAdminProductSku();
const savePolicyMutation = useSaveAdminSkuCancellationPolicy();

const selectedSpuIdRaw = ref("");
const selectedSkuIdRaw = ref("");
const isCreatingSpu = ref(false);
const isCreatingSku = ref(false);
const localErrorMessage = ref<string | null>(null);

const spuForm = ref<SpuEditorForm>(toSpuForm(emptySpuInput()));
const skuForm = ref<SkuEditorForm>(toSkuForm(emptySkuInput()));
const policyForm = ref<PolicyEditorForm>(toPolicyForm(emptyPolicyInput()));

const products = computed(() => workspaceQuery.data.value?.products ?? []);
const selectedSpuId = computed<number | null>(() => {
  const parsed = Number(selectedSpuIdRaw.value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
});
const selectedSkuId = computed<number | null>(() => {
  const parsed = Number(selectedSkuIdRaw.value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
});

const selectedProduct = computed<ProductRecord | null>(
  () => products.value.find((product) => product.spu.id === selectedSpuId.value) ?? null,
);

const selectedProductType = computed<ProductType | null>(
  () => selectedProduct.value?.spu.productType ?? null,
);

const selectedSkuRecord = computed<SkuRecord | null>(
  () =>
    selectedProduct.value?.skus.find((record) => record.sku.id === selectedSkuId.value) ??
    null,
);

const isSavingSpu = computed(
  () => createSpuMutation.isPending.value || updateSpuMutation.isPending.value,
);
const isSavingSku = computed(
  () => createSkuMutation.isPending.value || updateSkuMutation.isPending.value,
);
const isSavingPolicy = computed(() => savePolicyMutation.isPending.value);

const pageErrorMessage = computed(
  () =>
    localErrorMessage.value ||
    createSpuMutation.error.value?.message ||
    updateSpuMutation.error.value?.message ||
    createSkuMutation.error.value?.message ||
    updateSkuMutation.error.value?.message ||
    savePolicyMutation.error.value?.message ||
    null,
);

watch(
  products,
  (nextProducts) => {
    if (nextProducts.length === 0) {
      selectedSpuIdRaw.value = "";
      selectedSkuIdRaw.value = "";
      return;
    }

    if (!nextProducts.some((product) => String(product.spu.id) === selectedSpuIdRaw.value)) {
      selectedSpuIdRaw.value = String(nextProducts[0]!.spu.id);
      isCreatingSpu.value = false;
    }
  },
  { immediate: true },
);

watch(
  [selectedProduct, isCreatingSpu],
  ([product, creating]) => {
    spuForm.value = toSpuForm(
      creating || !product
        ? emptySpuInput()
        : {
            name: product.spu.name,
            productType: product.spu.productType,
            status: product.spu.status,
            salesPolicy: product.spu.salesPolicy,
            servicePolicy: product.spu.servicePolicy,
            pricingRules: product.spu.pricingPolicy.rules,
            presentation: product.spu.presentation,
            facts: product.spu.facts,
          },
    );
  },
  { immediate: true },
);

watch(
  [selectedProduct, isCreatingSku],
  ([product, creating]) => {
    if (!product) {
      selectedSkuIdRaw.value = "";
      return;
    }

    if (
      !creating &&
      !product.skus.some((record) => String(record.sku.id) === selectedSkuIdRaw.value)
    ) {
      selectedSkuIdRaw.value = product.skus[0] ? String(product.skus[0].sku.id) : "";
    }
  },
  { immediate: true },
);

watch(
  [selectedSkuRecord, isCreatingSku],
  ([record, creating]) => {
    if (creating || !record) {
      skuForm.value = toSkuForm(emptySkuInput());
      policyForm.value = toPolicyForm(emptyPolicyInput());
      return;
    }

    skuForm.value = toSkuForm({
      name: record.sku.name,
      status: record.sku.status,
      sortOrder: record.sku.sortOrder,
      facts: record.sku.facts,
      pricingModel: record.sku.pricingModel,
      cancellationPolicyRef: record.sku.cancellationPolicyRef ?? null,
    });

    policyForm.value = toPolicyForm({
      operatorBufferMinutes: record.cancellationPolicy?.operatorBufferMinutes ?? 30,
      tiers: record.cancellationPolicy?.tiers ?? emptyPolicyInput().tiers,
    });
  },
  { immediate: true },
);

const selectSpu = (spuId: number) => {
  selectedSpuIdRaw.value = String(spuId);
  isCreatingSpu.value = false;
  isCreatingSku.value = false;
};

const selectSku = (skuId: number) => {
  selectedSkuIdRaw.value = String(skuId);
  isCreatingSku.value = false;
};

const prepareNewSpu = () => {
  isCreatingSpu.value = true;
  isCreatingSku.value = false;
  selectedSkuIdRaw.value = "";
};

const prepareNewSku = () => {
  if (selectedSpuId.value === null) {
    localErrorMessage.value = t("adminCommerceProducts.selectSpuHint");
    return;
  }
  isCreatingSku.value = true;
  selectedSkuIdRaw.value = "";
};

const parseIntegerField = (
  value: NumberInput,
  label: string,
  options: { min?: number; max?: number } = {},
): number => {
  const parsed =
    typeof value === "number" ? value : Number.parseInt(value.trim(), 10);
  if (!Number.isInteger(parsed)) {
    throw new Error(`${label} 必须是整数`);
  }
  if (options.min !== undefined && parsed < options.min) {
    throw new Error(`${label} 不能小于 ${options.min}`);
  }
  if (options.max !== undefined && parsed > options.max) {
    throw new Error(`${label} 不能大于 ${options.max}`);
  }
  return parsed;
};

const parseOptionalPositiveInteger = (
  value: string,
  label: string,
): number | undefined => {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return parseIntegerField(trimmed, label, { min: 1 });
};

const parseNullableNonnegativeInteger = (
  value: string,
  label: string,
): number | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return parseIntegerField(trimmed, label, { min: 0 });
};

const buildQuantityPolicy = (): AdminProductSpuInput["salesPolicy"]["quantityPolicy"] => {
  if (spuForm.value.quantityPolicyType === "PER_PARTICIPANT") {
    return { type: "PER_PARTICIPANT" };
  }
  if (spuForm.value.quantityPolicyType === "USER_SELECTED") {
    const min = parseIntegerField(
      spuForm.value.userSelectedMin,
      t("adminCommerceProducts.minQuantityLabel"),
      { min: 0 },
    );
    const max = parseIntegerField(
      spuForm.value.userSelectedMax,
      t("adminCommerceProducts.maxQuantityLabel"),
      { min: 1 },
    );
    if (min > max) {
      throw new Error(t("adminCommerceProducts.quantityRangeError"));
    }
    return { type: "USER_SELECTED", min, max };
  }
  return {
    type: "FIXED",
    quantity: parseIntegerField(
      spuForm.value.fixedQuantity,
      t("adminCommerceProducts.fixedQuantityLabel"),
      { min: 1 },
    ),
  };
};

const buildServicePolicy = (): AdminProductSpuInput["servicePolicy"] => {
  if (spuForm.value.productType === "RIDE_HAILING") {
    return { type: "RIDE_HAILING" };
  }
  return {
    type: "RENTAL",
    bookingLeadTimeMinutes: parseIntegerField(
      spuForm.value.rentalBookingLeadTimeMinutes,
      t("adminCommerceProducts.serviceRentalLeadTimeLabel"),
      { min: 0 },
    ),
    requiresContactPhone: spuForm.value.rentalRequiresContactPhone,
    requiresRealName: spuForm.value.rentalRequiresRealName,
    requiresNationalId: spuForm.value.rentalRequiresNationalId,
  };
};

const buildFactValue = (fact: FactEntryDraft): unknown => {
  if (fact.valueKind === "preserve") return fact.originalValue;
  if (fact.valueKind === "null") return null;
  if (fact.valueKind === "boolean") return fact.booleanValue;
  if (fact.valueKind === "number") {
    const parsed = Number(fact.valueText.trim());
    if (!Number.isFinite(parsed)) {
      throw new Error(`${fact.key || t("adminCommerceProducts.factKeyLabel")} 必须是数字`);
    }
    return parsed;
  }
  return fact.valueText;
};

const buildFactsRecord = (
  facts: FactEntryDraft[],
  label: string,
): Record<string, unknown> => {
  const record: Record<string, unknown> = {};
  const seen = new Set<string>();
  for (const fact of facts) {
    const key = fact.key.trim();
    if (!key) continue;
    if (seen.has(key)) {
      throw new Error(`${label} 有重复 Key: ${key}`);
    }
    seen.add(key);
    record[key] = buildFactValue(fact);
  }
  return record;
};

const buildPricingRules = (): AdminProductSpuInput["pricingRules"] =>
  spuForm.value.pricingRules.map((rule) => {
    const id = parseIntegerField(
      rule.id,
      t("adminCommerceProducts.pricingRuleIdLabel"),
    );
    const skuId = parseOptionalPositiveInteger(
      rule.targetSkuIdText,
      t("adminCommerceProducts.targetSkuIdLabel"),
    );
    const target: SpuPricingRule["target"] =
      skuId === undefined ? { level: "SKU" } : { level: "SKU", skuId };

    let action: SpuPricingRule["action"];
    if (rule.actionType === "MINUS") {
      action = {
        type: "MINUS",
        payload: {
          amountFen: parseIntegerField(
            rule.amountFen,
            t("adminCommerceProducts.amountFenLabel"),
          ),
        },
      };
    } else if (rule.actionType === "RATIO") {
      action = {
        type: "RATIO",
        payload: {
          ratioBps: parseIntegerField(
            rule.ratioBps,
            t("adminCommerceProducts.ratioBpsLabel"),
            { min: 0 },
          ),
        },
      };
    } else {
      action = {
        type: "RESET",
        payload: {
          pricingModel:
            rule.resetPricingModelMode === "PRESERVE" && rule.resetPricingModel !== null
              ? rule.resetPricingModel
              : {
                  type: "FIXED_TOTAL",
                  amountFen: parseIntegerField(
                    rule.resetAmountFen,
                    t("adminCommerceProducts.resetAmountFenLabel"),
                    { min: 0 },
                  ),
                },
        },
      };
    }

    return {
      id,
      label: rule.label.trim(),
      description: rule.description.trim(),
      conditionRule: rule.conditionMode === "ALWAYS" ? null : rule.conditionRule,
      action,
      target,
      continue: rule.continue,
    };
  });

const buildPresentation = (): AdminProductSpuInput["presentation"] => ({
  heroImageAssetIds: buildStringList(spuForm.value.heroImageAssetIds),
  detailImageAssetIds: buildStringList(spuForm.value.detailImageAssetIds),
  sellingPoints: buildStringList(spuForm.value.sellingPoints),
  parameterGroups: spuForm.value.parameterGroups
    .map((group) => ({
      title: group.title.trim(),
      items: group.items
        .map((item) => ({
          label: item.label.trim(),
          value: item.value.trim(),
        }))
        .filter((item) => item.label.length > 0 || item.value.length > 0),
    }))
    .filter((group) => group.title.length > 0 || group.items.length > 0),
  noticeBlocks: spuForm.value.noticeBlocks
    .map((block) => ({
      title: block.title.trim(),
      content: block.content.trim(),
    }))
    .filter((block) => block.title.length > 0 || block.content.length > 0),
});

const buildSpuInput = (): AdminProductSpuInput => ({
  name: spuForm.value.name.trim(),
  productType: spuForm.value.productType,
  status: spuForm.value.status,
  salesPolicy: {
    skuSelectionPolicy: { type: "EXACTLY_ONE" },
    quantityPolicy: buildQuantityPolicy(),
  },
  servicePolicy: buildServicePolicy(),
  pricingRules: buildPricingRules(),
  presentation: buildPresentation(),
  facts: buildFactsRecord(spuForm.value.facts, t("adminCommerceProducts.factsLabel")),
});

const buildSkuFacts = (): SkuFacts => {
  if (selectedProductType.value === "RIDE_HAILING") {
    return {
      type: "RIDE_HAILING",
      vehicleClass: skuForm.value.rideVehicleClass.trim(),
    };
  }
  return {
    type: "RENTAL",
    zoneCode: skuForm.value.rentalZoneCode.trim(),
    participantCount: parseIntegerField(
      skuForm.value.rentalParticipantCount,
      t("adminCommerceProducts.participantCountLabel"),
      { min: 1 },
    ),
    durationMinutes: parseIntegerField(
      skuForm.value.rentalDurationMinutes,
      t("adminCommerceProducts.durationMinutesLabel"),
      { min: 1 },
    ),
  };
};

const buildSkuPricingModel = (): SkuPricingModel => {
  if (skuForm.value.pricingModelType === "DYNAMIC_QUOTE") {
    if (skuForm.value.dynamicPricingModel === null) {
      throw new Error(t("adminCommerceProducts.dynamicPricingMissingError"));
    }
    return skuForm.value.dynamicPricingModel;
  }
  return {
    type: "FIXED_TOTAL",
    amountFen: parseIntegerField(
      skuForm.value.fixedAmountFen,
      t("adminCommerceProducts.amountFenLabel"),
      { min: 0 },
    ),
  };
};

const buildSkuInput = (): Omit<AdminProductSkuInput, "spuId"> => ({
  name: skuForm.value.name.trim(),
  status: skuForm.value.status,
  sortOrder: parseIntegerField(
    skuForm.value.sortOrder,
    t("adminCommerceProducts.sortOrderLabel"),
  ),
  facts: buildSkuFacts(),
  pricingModel: buildSkuPricingModel(),
  cancellationPolicyRef: selectedSkuRecord.value?.sku.cancellationPolicyRef ?? null,
});

const buildPolicyInput = (): AdminSkuCancellationPolicyInput => ({
  operatorBufferMinutes: parseIntegerField(
    policyForm.value.operatorBufferMinutes,
    t("adminCommerceProducts.operatorBufferMinutesLabel"),
    { min: 0 },
  ),
  tiers: policyForm.value.tiers.map((tier) => ({
    code: tier.code.trim(),
    fromMinutesBeforeStart: parseNullableNonnegativeInteger(
      tier.fromMinutesBeforeStartText,
      t("adminCommerceProducts.tierFromLabel"),
    ),
    untilMinutesBeforeStart: parseNullableNonnegativeInteger(
      tier.untilMinutesBeforeStartText,
      t("adminCommerceProducts.tierUntilLabel"),
    ),
    refundPercent: parseIntegerField(
      tier.refundPercent,
      t("adminCommerceProducts.refundPercentLabel"),
      { min: 0, max: 100 },
    ),
    requiresOperatorHandling: tier.requiresOperatorHandling,
    visibleLabel: tier.visibleLabel.trim(),
  })),
});

const addSpuPricingRule = () => {
  const nextId =
    spuForm.value.pricingRules.reduce((max, rule) => {
      const parsed = typeof rule.id === "number" ? rule.id : Number(rule.id);
      return Number.isFinite(parsed) ? Math.max(max, parsed) : max;
    }, 0) + 1;
  spuForm.value.pricingRules.push({
    draftId: createDraftId("pricing-rule"),
    id: nextId,
    label: "",
    description: "",
    conditionMode: "ALWAYS",
    conditionRule: null,
    actionType: "MINUS",
    amountFen: 0,
    ratioBps: 10000,
    resetPricingModelMode: "FIXED_TOTAL",
    resetAmountFen: 0,
    resetPricingModel: null,
    targetSkuIdText: "",
    continue: true,
  });
};

const removeSpuPricingRule = (index: number) => {
  spuForm.value.pricingRules.splice(index, 1);
};

const addParameterGroup = () => {
  spuForm.value.parameterGroups.push({
    id: createDraftId("parameter-group"),
    title: "",
    items: [],
  });
};

const removeParameterGroup = (index: number) => {
  spuForm.value.parameterGroups.splice(index, 1);
};

const addParameterItem = (groupIndex: number) => {
  spuForm.value.parameterGroups[groupIndex]?.items.push({
    id: createDraftId("parameter-item"),
    label: "",
    value: "",
  });
};

const removeParameterItem = (groupIndex: number, itemIndex: number) => {
  spuForm.value.parameterGroups[groupIndex]?.items.splice(itemIndex, 1);
};

const addNoticeBlock = () => {
  spuForm.value.noticeBlocks.push({
    id: createDraftId("notice"),
    title: "",
    content: "",
  });
};

const removeNoticeBlock = (index: number) => {
  spuForm.value.noticeBlocks.splice(index, 1);
};

const addSpuFact = () => {
  spuForm.value.facts.push({
    id: createDraftId("fact"),
    key: "",
    valueKind: "string",
    valueText: "",
    booleanValue: false,
    originalValue: "",
  });
};

const removeSpuFact = (index: number) => {
  spuForm.value.facts.splice(index, 1);
};

const addCancellationTier = () => {
  policyForm.value.tiers.push({
    id: createDraftId("tier"),
    code: "",
    fromMinutesBeforeStartText: "",
    untilMinutesBeforeStartText: "",
    refundPercent: 100,
    requiresOperatorHandling: false,
    visibleLabel: "",
  });
};

const removeCancellationTier = (index: number) => {
  if (policyForm.value.tiers.length <= 1) return;
  policyForm.value.tiers.splice(index, 1);
};

const handleSaveSpu = async () => {
  localErrorMessage.value = null;
  try {
    const input = buildSpuInput();
    if (isCreatingSpu.value) {
      const result = await createSpuMutation.mutateAsync(input);
      selectedSpuIdRaw.value = String(result.id);
      isCreatingSpu.value = false;
      return;
    }
    if (selectedSpuId.value === null) {
      throw new Error(t("adminCommerceProducts.selectSpuHint"));
    }
    await updateSpuMutation.mutateAsync({ spuId: selectedSpuId.value, input });
  } catch (error) {
    localErrorMessage.value =
      error instanceof Error ? error.message : t("common.operationFailed");
  }
};

const handleSaveSku = async () => {
  localErrorMessage.value = null;
  try {
    if (selectedSpuId.value === null) {
      throw new Error(t("adminCommerceProducts.selectSpuHint"));
    }
    const input = buildSkuInput();
    if (isCreatingSku.value) {
      const result = await createSkuMutation.mutateAsync({
        spuId: selectedSpuId.value,
        ...input,
      });
      selectedSkuIdRaw.value = String(result.id);
      isCreatingSku.value = false;
      return;
    }
    if (selectedSkuId.value === null) {
      throw new Error(t("adminCommerceProducts.selectSkuHint"));
    }
    await updateSkuMutation.mutateAsync({ skuId: selectedSkuId.value, input });
  } catch (error) {
    localErrorMessage.value =
      error instanceof Error ? error.message : t("common.operationFailed");
  }
};

const handleSavePolicy = async () => {
  localErrorMessage.value = null;
  try {
    if (selectedSkuId.value === null) {
      throw new Error(t("adminCommerceProducts.selectSkuHint"));
    }
    await savePolicyMutation.mutateAsync({
      skuId: selectedSkuId.value,
      input: buildPolicyInput(),
    });
  } catch (error) {
    localErrorMessage.value =
      error instanceof Error ? error.message : t("common.operationFailed");
  }
};

const clearErrors = () => {
  localErrorMessage.value = null;
  createSpuMutation.reset();
  updateSpuMutation.reset();
  createSkuMutation.reset();
  updateSkuMutation.reset();
  savePolicyMutation.reset();
};

const StringListEditor = defineComponent({
  name: "StringListEditor",
  props: {
    modelValue: {
      type: Array as PropType<EditableStringItem[]>,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    addLabel: {
      type: String,
      required: true,
    },
    removeLabel: {
      type: String,
      required: true,
    },
  },
  emits: {
    "update:modelValue": (_value: EditableStringItem[]) => true,
  },
  setup(props, { emit }) {
    const handleAdd = () => {
      emit("update:modelValue", [
        ...props.modelValue,
        { id: createDraftId("string-item"), value: "" },
      ]);
    };
    const handleRemove = (index: number) => {
      emit(
        "update:modelValue",
        props.modelValue.filter((_item, itemIndex) => itemIndex !== index),
      );
    };
    const handleInput = (index: number, value: string) => {
      emit(
        "update:modelValue",
        props.modelValue.map((item, itemIndex) =>
          itemIndex === index ? { ...item, value } : item,
        ),
      );
    };

    return () =>
      h("div", { class: "list-editor" }, [
        h("div", { class: "section-header" }, [
          h("h4", { class: "subsection-title" }, props.title),
          h(
            Button,
            {
              appearance: "pill",
              tone: "outline",
              size: "sm",
              type: "button",
              onClick: handleAdd,
            },
            {
              leading: () => h("span", { class: "i-mdi-plus" }),
              default: () => props.addLabel,
            },
          ),
        ]),
        props.modelValue.length === 0
          ? h("p", { class: "hint" }, t("adminCommerceProducts.emptyListPlaceholder"))
          : props.modelValue.map((item, index) =>
              h("div", { key: item.id, class: "inline-row" }, [
                h("input", {
                  class: "field-input",
                  value: item.value,
                  onInput: (event: Event) => {
                    const target = event.target as HTMLInputElement | null;
                    handleInput(index, target?.value ?? "");
                  },
                }),
                h(
                  Button,
                  {
                    appearance: "pill",
                    tone: "danger",
                    size: "sm",
                    type: "button",
                    onClick: () => handleRemove(index),
                  },
                  {
                    leading: () => h("span", { class: "i-mdi-close" }),
                    default: () => props.removeLabel,
                  },
                ),
              ]),
            ),
      ]);
  },
});

const FactEntryEditor = defineComponent({
  name: "FactEntryEditor",
  props: {
    modelValue: {
      type: Object as PropType<FactEntryDraft>,
      required: true,
    },
    removeLabel: {
      type: String,
      required: true,
    },
  },
  emits: {
    "update:modelValue": (_value: FactEntryDraft) => true,
    remove: () => true,
  },
  setup(props, { emit }) {
    const update = (patch: Partial<FactEntryDraft>) => {
      emit("update:modelValue", { ...props.modelValue, ...patch });
    };

    return () =>
      h("article", { class: "repeated-item" }, [
        h("div", { class: "grid" }, [
          h("label", { class: "field" }, [
            h("span", { class: "field-label" }, t("adminCommerceProducts.factKeyLabel")),
            h("input", {
              class: "field-input",
              value: props.modelValue.key,
              onInput: (event: Event) => {
                const target = event.target as HTMLInputElement | null;
                update({ key: target?.value ?? "" });
              },
            }),
          ]),
          h("label", { class: "field" }, [
            h("span", { class: "field-label" }, t("adminCommerceProducts.factValueTypeLabel")),
            h(
              "select",
              {
                class: "field-input",
                value: props.modelValue.valueKind,
                onChange: (event: Event) => {
                  const target = event.target as HTMLSelectElement | null;
                  update({ valueKind: (target?.value ?? "string") as FactValueKind });
                },
              },
              [
                h("option", { value: "string" }, t("adminCommerceProducts.factValueString")),
                h("option", { value: "number" }, t("adminCommerceProducts.factValueNumber")),
                h("option", { value: "boolean" }, t("adminCommerceProducts.factValueBoolean")),
                h("option", { value: "null" }, t("adminCommerceProducts.factValueNull")),
                props.modelValue.valueKind === "preserve"
                  ? h("option", { value: "preserve" }, t("adminCommerceProducts.factValuePreserve"))
                  : null,
              ],
            ),
          ]),
          props.modelValue.valueKind === "string" || props.modelValue.valueKind === "number"
            ? h("label", { class: "field" }, [
                h("span", { class: "field-label" }, t("adminCommerceProducts.factValueLabel")),
                h("input", {
                  class: "field-input",
                  value: props.modelValue.valueText,
                  onInput: (event: Event) => {
                    const target = event.target as HTMLInputElement | null;
                    update({ valueText: target?.value ?? "" });
                  },
                }),
              ])
            : null,
          props.modelValue.valueKind === "boolean"
            ? h("label", { class: "field" }, [
                h("span", { class: "field-label" }, t("adminCommerceProducts.factValueLabel")),
                h(
                  "select",
                  {
                    class: "field-input",
                    value: props.modelValue.booleanValue ? "true" : "false",
                    onChange: (event: Event) => {
                      const target = event.target as HTMLSelectElement | null;
                      update({ booleanValue: target?.value === "true" });
                    },
                  },
                  [
                    h("option", { value: "true" }, "true"),
                    h("option", { value: "false" }, "false"),
                  ],
                ),
              ])
            : null,
          props.modelValue.valueKind === "preserve"
            ? h("p", { class: "hint field--full" }, t("adminCommerceProducts.customValuePreservedHint"))
            : null,
        ]),
        h("div", { class: "inline-actions" }, [
          h(
            Button,
            {
              appearance: "pill",
              tone: "danger",
              size: "sm",
              type: "button",
              onClick: () => emit("remove"),
            },
            {
              leading: () => h("span", { class: "i-mdi-delete-outline" }),
              default: () => props.removeLabel,
            },
          ),
        ]),
      ]);
  },
});
</script>

<style lang="scss" scoped>
.stack,
.selection-list,
.form-stack,
.editor-section,
.list-editor {
  display: flex;
  flex-direction: column;
}

.stack,
.selection-list {
  gap: var(--sys-spacing-medium);
}

.form-stack,
.editor-section {
  gap: var(--sys-spacing-large);
}

.list-editor {
  gap: var(--sys-spacing-small);
}

.editor-section {
  min-width: 0;
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface-container-low);
}

.section-header,
.inline-actions,
.inline-row {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-small);
}

.section-header {
  justify-content: space-between;
  flex-wrap: wrap;
}

.inline-actions {
  justify-content: flex-end;
  flex-wrap: wrap;
}

.inline-row {
  align-items: flex-end;
}

.inline-row > .field,
.inline-row > .field-input {
  flex: 1 1 12rem;
}

.section-title,
.subsection-title {
  margin: 0;
  color: var(--sys-color-on-surface);
}

.section-title {
  @include mx.pu-font(title-small);
}

.subsection-title {
  @include mx.pu-font(label-large);
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sys-spacing-small);
  align-items: end;
}

.toggle-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sys-spacing-medium);
}

.field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.field--full {
  grid-column: 1 / -1;
}

.field-label,
.hint,
small {
  @include mx.pu-font(body-medium);
}

.field-label {
  color: var(--sys-color-on-surface-variant);
}

.hint,
small {
  margin: 0;
  color: var(--sys-color-on-surface-variant);
}

.field-input {
  width: 100%;
  min-width: 0;
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
}

.field-textarea {
  min-height: 5rem;
  resize: vertical;
}

.repeated-item {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--sys-spacing-small);
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface);
}

@media (max-width: 720px) {
  .grid,
  .inline-row {
    grid-template-columns: 1fr;
  }

  .grid {
    display: grid;
  }

  .inline-row {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
