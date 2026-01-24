'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import { runSimulation, runSensitivityAnalysis, parseGoal } from '@/lib/api'
import type { SimulationRequest } from '@/types'

export function useParseGoal() {
  return useMutation({
    mutationFn: (goal: string) => parseGoal(goal),
  })
}

export function useRunSimulation() {
  return useMutation({
    mutationFn: (request: SimulationRequest) => runSimulation(request),
  })
}

export function useSensitivityAnalysis() {
  return useMutation({
    mutationFn: (request: SimulationRequest) => runSensitivityAnalysis(request),
  })
}

// Combined hook for the full simulation flow
export function useSimulationFlow() {
  const parseGoalMutation = useParseGoal()
  const simulationMutation = useRunSimulation()
  const sensitivityMutation = useSensitivityAnalysis()

  const runFullSimulation = async (
    goal: string,
    financialProfile: any,
    userInputs: any
  ) => {
    // Step 1: Parse the goal
    const parsedGoal = await parseGoalMutation.mutateAsync(goal)

    // Step 2: Run simulation
    const request: SimulationRequest = {
      financialProfile,
      userInputs,
      goal: {
        targetAmount: parsedGoal.targetAmount,
        timelineMonths: parsedGoal.timelineMonths,
        goalType: parsedGoal.goalType,
      },
    }

    const results = await simulationMutation.mutateAsync(request)

    // Step 3: Run sensitivity analysis
    const sensitivity = await sensitivityMutation.mutateAsync(request)

    return {
      parsedGoal,
      results,
      sensitivity,
    }
  }

  return {
    runFullSimulation,
    isLoading:
      parseGoalMutation.isPending ||
      simulationMutation.isPending ||
      sensitivityMutation.isPending,
    error:
      parseGoalMutation.error ||
      simulationMutation.error ||
      sensitivityMutation.error,
  }
}
