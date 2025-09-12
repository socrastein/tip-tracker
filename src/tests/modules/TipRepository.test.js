/// <reference types="vitest" />
/** @vitest-environment node  */

import { expect, test, describe, beforeEach } from "vitest";

import { mockTip, generateMockTips } from "../MockTips";
import { Tip } from "../../scripts/ClassTip";
import { TipRepository } from "../../scripts/TipRepository";

describe('TipRepository', () => {

    beforeEach(() => localStorage.clear());

    test('mockStorage is active', () => {
        if (typeof localStorage._setStore !== 'function') throw new Error('Expected mockStorage');
    });

    describe('tip format verification', () => {

        test('valid key prefix identified', () => {
            const validTip = mockTip(100);
            const validKey = validTip.storageKey;
            expect(TipRepository.isValidTipKey(validKey)).toBeTruthy();
        });

        test('invalid key prefix rejected', () => {
            const invalidKey = "beanBean";
            expect(TipRepository.isValidTipKey(invalidKey)).toBeFalsy();
        });

        test('ignores tips without prefix', () => {
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

    describe('save to localStorage', () => {
        const mockTips = generateMockTips(10);
        const unrelated = { key: 'someObject', value: 'someData' };

        test('ignores all but saved tips', () => {
            mockTips.forEach(tip => {
                localStorage.setItem(tip.storageKey, tip.storageValue);
            });
            localStorage.setItem(unrelated.key, unrelated.value);
            const tips = TipRepository.loadAllFromStorage();
            expect(tips.length).toBe(10);
        });

        test('saves X number of tips', () => {
            TipRepository.saveAllToStorage(mockTips);
            console.log('localStorage store:', localStorage._getStore());
            console.log('localStorage.length:', localStorage.length);
            expect(localStorage.length).toEqual(10);
        });
    });

    describe('load from localStorage', () => {
        test('', () => {

        });
    });
});