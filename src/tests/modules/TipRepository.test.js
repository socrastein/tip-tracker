/// <reference types="vitest" />
/** @vitest-environment node  */

import { expect, it, describe, beforeEach } from "vitest";

import { mockTip, generateMockTips } from "../MockTips";
import { TipRepository } from "../../scripts/TipRepository";

describe('TipRepository', () => {

    beforeEach(() => localStorage.clear());

    it('mockStorage is active', () => {
        if (typeof localStorage._setStore !== 'function') throw new Error('Expected mockStorage');
    });

    describe('tip format verification', () => {

        it('should identify valid key prefix', () => {
            const validTip = mockTip(100);
            const validKey = validTip.storageKey;
            expect(TipRepository.isValidTipKey(validKey)).toBeTruthy();
        });

        it('should reject invalid prefix', () => {
            const invalidKey = "beanBean";
            expect(TipRepository.isValidTipKey(invalidKey)).toBeFalsy();
        });

        it('ignores tips without prefix', () => {
            const validTip = mockTip(100);
            const validKey = validTip.storageKey;
            const noPrefix = validKey.split(".").slice(1);
            const validValue = validTip.storageValue;

            localStorage.setItem(validKey, validValue);
            localStorage.setItem(noPrefix, validValue);
            expect(() => TipRepository.loadFromStorage(validKey)).not.toThrow();
            expect(() => TipRepository.loadFromStorage(noPrefix)).toThrow();
        });
    });

    describe('saves to localStorage', () => {
        const mockTips = generateMockTips(10);
        const unrelated = { key: 'someObject', value: 'someData' };

        it('ignores all but saved tips', () => {
            mockTips.forEach(tip => {
                localStorage.setItem(tip.storageKey, tip.storageValue);
            });
            localStorage.setItem(unrelated.key, unrelated.value);
            const tips = TipRepository.loadAllFromStorage();
            expect(tips.length).toBe(10);
        });

        it('saves X number of tips', () => {
            TipRepository.saveAllToStorage(mockTips);
            expect(localStorage.length).toEqual(10);
        });
    });

    describe('load from localStorage', () => {
        it('', () => {

        });
    });
});