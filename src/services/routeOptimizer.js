
/**
 * Optimizes a route using the Nearest Neighbor algorithm (Manual Implementation).
 * @param {Array} orders - List of orders with lat/lng.
 * @param {Object} startLocation - Starting point { lat, lng }.
 * @returns {Array} - Sorted list of orders with `delivery_sequence`.
 */
function getDistance(p1, p2) {
    const R = 6371e3; // metres
    const q1 = p1.latitude * Math.PI / 180;
    const q2 = p2.latitude * Math.PI / 180;
    const dq = (p2.latitude - p1.latitude) * Math.PI / 180;
    const dl = (p2.longitude - p1.longitude) * Math.PI / 180;

    const a = Math.sin(dq / 2) * Math.sin(dq / 2) +
        Math.cos(q1) * Math.cos(q2) *
        Math.sin(dl / 2) * Math.sin(dl / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

function optimizeRoute(orders, startLocation) {
    if (!orders || orders.length === 0) return [];

    // Filter valid orders
    let remaining = orders.filter(o => o.lat && o.lng).map(o => ({
        ...o,
        latitude: parseFloat(o.lat),
        longitude: parseFloat(o.lng)
    }));

    const invalid = orders.filter(o => !o.lat || !o.lng);

    const sorted = [];
    let current = {
        latitude: parseFloat(startLocation.lat),
        longitude: parseFloat(startLocation.lng)
    };

    let seq = 1;

    // ... Nearest Neighbor Logic (keep existing while loop) ...
    while (remaining.length > 0) {
        let nearestIdx = -1;
        let minDist = Infinity;

        for (let i = 0; i < remaining.length; i++) {
            const dist = getDistance(current, remaining[i]);
            if (dist < minDist) {
                minDist = dist;
                nearestIdx = i;
            }
        }

        if (nearestIdx !== -1) {
            const nextOrder = remaining[nearestIdx];
            sorted.push({ ...nextOrder, delivery_sequence: seq++ });
            current = { latitude: nextOrder.latitude, longitude: nextOrder.longitude };
            remaining.splice(nearestIdx, 1);
        } else {
            break;
        }
    }

    // --- 2-OPT OPTIMIZATION START ---
    // Prepare full path including Start Location for optimization
    const startNode = {
        latitude: parseFloat(startLocation.lat),
        longitude: parseFloat(startLocation.lng),
        isStart: true
    };

    // The path to optimize is [Start, ...Orders]
    // We lock index 0 (Start) and optimize the rest
    let fullPath = [startNode, ...sorted];

    // 2-OPT Algorithm
    let improved = true;
    while (improved) {
        improved = false;
        // i starts at 1 because index 0 is fixed Start Location
        // We look for segments i...k to reverse
        for (let i = 1; i < fullPath.length - 1; i++) {
            for (let k = i + 1; k < fullPath.length; k++) {
                // Determine if swap improves the route
                // We compare edges: (node[i-1] -> node[i]) + (node[k] -> node[k+1])
                // vs new edges:     (node[i-1] -> node[k]) + (node[i] -> node[k+1])
                // Note: if k is last element, k+1 is undefined (end of path), so we only check distance to k

                const nodeA = fullPath[i - 1];
                const nodeB = fullPath[i];
                const nodeC = fullPath[k];
                const nodeD = fullPath[k + 1]; // Undefined if k is last

                // Current distance of edges involved
                let currentDist = getDistance(nodeA, nodeB);
                if (nodeD) currentDist += getDistance(nodeC, nodeD);

                // New distance if we swap (reverse i...k)
                // New edge A connects to C (was end of segment)
                // New edge B (was start of segment) connects to D
                let newDist = getDistance(nodeA, nodeC);
                if (nodeD) newDist += getDistance(nodeB, nodeD);

                if (newDist < currentDist) {
                    // Perform Swap: Reverse segment i...k
                    const newPath = fullPath.slice(0); // Clone
                    const segment = newPath.slice(i, k + 1).reverse();
                    newPath.splice(i, segment.length, ...segment);
                    fullPath = newPath;
                    improved = true;
                    // Heuristic: Restart search after improvement to ensure best local consistency
                    // break to outer loop
                }
            }
            if (improved) break;
        }
    }

    // Extract optimized orders and re-sequence
    // Slice(1) removes the Start Node
    const finalSorted = fullPath.slice(1).map((o, index) => ({
        ...o,
        delivery_sequence: index + 1
    }));
    // --- 2-OPT OPTIMIZATION END ---

    // Append invalid orders at the end
    invalid.forEach(o => {
        finalSorted.push({ ...o, delivery_sequence: finalSorted.length + 1 });
    });

    return finalSorted;
}

module.exports = { optimizeRoute };
