import { useState, useEffect } from "react"

export function useServerStatus() {
  const [isServerOnline, setIsServerOnline] = useState(true) // Assume online initially
  const [isChecking, setIsChecking] = useState(true)
  const [hasCheckedOnce, setHasCheckedOnce] = useState(false)

  const checkServerStatus = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3002"
      const response = await fetch(`${baseUrl}/`, { signal: AbortSignal.timeout(3000) })
      
      if (response.ok) {
        const text = await response.text()
        if (text === "ok") {
          setIsServerOnline(true)
          setIsChecking(false)
          setHasCheckedOnce(true)
          return true
        }
      }
      
      setIsServerOnline(false)
      setHasCheckedOnce(true)
      return false
    } catch (error) {
      console.error("Error checking server status:", error)
      setIsServerOnline(false)
      setHasCheckedOnce(true)
      return false
    }
  }

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null

    const checkStatus = async () => {
      const isOnline = await checkServerStatus()
      
      if (isOnline) {
        if (intervalId) {
          clearInterval(intervalId)
          intervalId = null
        }
      }
    }

    // Initial check
    checkStatus()
    
    // Set up interval for checking if not online
    if (!isServerOnline) {
      intervalId = setInterval(checkStatus, 5000)
    }
    
    // Cleanup function
    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
      setIsChecking(false)
    }
  }, [isServerOnline])

  return {
    isServerOnline,
    isChecking
  }
}