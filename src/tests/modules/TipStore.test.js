import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TipStore } from '../../scripts/TipStore';
import { Tip } from '../../scripts/ClassTip';

// Mock Vue's reactive function
vi.mock('vue', () => ({
    reactive: vi.fn((obj) => obj)
}));

describe('TipStore', () => {
    let sampleTips;
    let sampleGroups;

    beforeEach(() => {
        // Create sample tips for testing
        sampleTips = [
            new Tip(100, '2024-01-05', 'Floor', 'Lunch'),
            new Tip(175, '2024-01-05', 'Banquet', 'Dinner'),
            new Tip(150, '2024-01-15', 'Banquet', 'Dinner'),
            new Tip(200, '2024-01-20', 'Floor', 'Lunch'),
            new Tip(250, '2024-02-10', 'Banquet', 'Dinner'),
            new Tip(300, '2024-02-25', 'Floor', 'Lunch'),
        ];

        sampleGroups = [
            {
                period: '2024-01-1', tips: [new Tip(100, '2024-01-05', 'Floor', 'Lunch'),
                new Tip(150, '2024-01-15', 'Banquet', 'Dinner')], total: 250
            },
            {
                period: '2024-01-2', tips: [new Tip(300, '2024-01-20', 'Floor', 'Lunch'), new Tip(200, '2024-01-25', 'Banquet', 'Dinner'),], total: 500
            }
        ];
    });

    describe('setAllTips', () => {
        it('should set tip array and show correct length', () => {
            TipStore.setAllTips(sampleTips);
            expect(TipStore._tipState.allTips).toEqual(sampleTips);
            expect(TipStore._tipState.allTips.length).toEqual(6);
        });

        it('should replace array with new one', () => {
            TipStore.setAllTips(sampleTips);
            const newArray = [
                new Tip(150, '2025-09-12', 'Floor', 'Dinner'),
                new Tip(250, '2025-09-10', 'Banquet', 'Dinner')
            ];
            TipStore.setAllTips(newArray);
            expect(TipStore._tipState.allTips).toEqual(newArray);
            expect(TipStore._tipState.allTips.length).toEqual(2);
        });
    });

    describe('setGroupedTips', () => {
        it('should set group array and show correct length', () => {
            TipStore.setGroupedTips(sampleGroups);
            expect(TipStore._tipState.groupedTips).toEqual(sampleGroups);
            expect(TipStore._tipState.groupedTips.length).toEqual(2);
        });

        it('should replace array with new one', () => {
            TipStore.setGroupedTips(sampleGroups);
            const newArray = [
                { period: '2025-01-1', tips: [], total: 0 }
            ];
            TipStore.setGroupedTips(newArray);
            expect(TipStore._tipState.groupedTips).toEqual(newArray);
            expect(TipStore._tipState.groupedTips.length).toEqual(1);
        });
    });

    describe('getAllTips', () => {
        it('should return the same array just set', () => {
            TipStore.setAllTips(sampleTips);
            expect(TipStore.getAllTips()).toEqual(sampleTips);
        });
    });

    describe('getGroupedTips', () => {
        it('should return the same array just set', () => {
            TipStore.setGroupedTips(sampleGroups);
            expect(TipStore._tipState.groupedTips).toEqual(sampleGroups);
        });
    });

    describe('getLengthOfAllTips', () => {
        it('correctly updates length as elements change', () => {
            TipStore.setAllTips(sampleTips);
            expect(TipStore._tipState.allTips.length).toEqual(6);
            TipStore._tipState.allTips.pop();
            expect(TipStore._tipState.allTips.length).toEqual(5);
        });
    });

    describe('getLengthOfGroupedTips', () => {
        it('', () => {
            TipStore.setGroupedTips(sampleGroups);
            expect(TipStore._tipState.groupedTips.length).toEqual(2);
            TipStore._tipState.groupedTips.pop();
            expect(TipStore._tipState.groupedTips.length).toEqual(1);
        });
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    describe('logAllTipsToConsole', () => {
        it('logs every tip in allTips', () => {
            TipStore.setAllTips(sampleTips);
            TipStore.logAllTipsToConsole();
            expect(consoleSpy).toHaveBeenCalledTimes(7);
            consoleSpy.mockReset();
        });

        it('logs tips up to the limit passed', () => {
            TipStore.logAllTipsToConsole(3);
            expect(consoleSpy).toHaveBeenCalledTimes(4);
            consoleSpy.mockReset();
        });
    });

    describe('logGroupedTipsToConsole', () => {
        // const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
        it('logs every group in groupedTips', () => {
            TipStore.setGroupedTips(sampleGroups);
            TipStore.logGroupedTipsToConsole();
            expect(consoleSpy).toHaveBeenCalledTimes(3);
            consoleSpy.mockReset();
        });

        it('logs groups up to the limit passed', () => {
            TipStore.logGroupedTipsToConsole(1);
            expect(consoleSpy).toHaveBeenCalledTimes(2);
            consoleSpy.mockRestore();
        });
    });

    describe('findGroupByKey', () => {
        it('returns the correct group by key', () => {
            const group = TipStore.findGroupByKey('2024-01-1');
            expect(group).toEqual(sampleGroups[0]);
        });

        it('returns undefined if no group matches key', () => {
            const group = TipStore.findGroupByKey('2024-05-1');
            expect(group).toEqual(undefined);
        });
    });

    describe('insertGroupInOrder', () => {
        it('', () => {

        });
    });

    describe('removeTipFromGroup', () => {
        it('', () => {

        });
    });

    describe('addTip', () => {
        it('', () => {

        });
    });

    describe('removeTip', () => {
        it('', () => {

        });
    });

    describe('editTip', () => {
        it('', () => {

        });
    });

    describe('checkForDuplicateTip', () => {
        it('', () => {

        });
    });


})

