import { Vector3 } from 'babylonjs';
import { Game } from '../settings';

export class Road {
    /// The lengths of straight segments of the road, generated by calling `generateSegments`
    segments: number[];

    private readonly isRoadEndForward: boolean;
    private readonly goalDistance: number;

    readonly leftEndFlagPos: Vector3;
    readonly rightEndFlagPos: Vector3;

    constructor(
        public length: number,
        public roadCurveProbability: (straightLength: number) => number,
    ) {
        this.segments = this.generateSegments();
        this.isRoadEndForward = this.segments.length % 2 == 1;

        // Calculate goal distance
        this.goalDistance = 0;
        if (this.isRoadEndForward) {
            this.goalDistance -= Game.CAR_START_POS[0].z;
            for (let i=0; i < this.segments.length; i += 2) {
                this.goalDistance += this.segments[i] * Game.ROAD_CONFIG.width;
            }
        } else {
            this.goalDistance -= Game.CAR_START_POS[0].x;
            for (let i=1; i < this.segments.length; i += 2) {
                this.goalDistance += this.segments[i] * Game.ROAD_CONFIG.width;
            }
        }
        // Subtract the length of the last block.
        this.goalDistance -= Game.ROAD_CONFIG.width;

        // Calculate the flags position (end of the road)
        this.leftEndFlagPos = new Vector3(0, 0, this.segments[0] * Game.ROAD_CONFIG.width);
        this.rightEndFlagPos = new Vector3(Game.ROAD_CONFIG.width, 0, this.segments[0] * Game.ROAD_CONFIG.width);
        for (let i=1; i < this.segments.length; i++) {
            // Forward segment.
            if (i % 2 == 0) {
                // Last segment, leave the last block for deceleration.
                if (i == this.segments.length - 1) {
                    this.leftEndFlagPos = this.leftEndFlagPos.add(new Vector3(0, 0, (this.segments[i] - 2) * Game.ROAD_CONFIG.width));
                    this.rightEndFlagPos = this.rightEndFlagPos.add(new Vector3(Game.ROAD_CONFIG.width, 0, (this.segments[i] - 1) * Game.ROAD_CONFIG.width));
                    break;
                }
                this.leftEndFlagPos = this.leftEndFlagPos.add(new Vector3(0, 0, (this.segments[i] - 1) * Game.ROAD_CONFIG.width));
                this.rightEndFlagPos = this.rightEndFlagPos.add(new Vector3(Game.ROAD_CONFIG.width, 0, this.segments[i] * Game.ROAD_CONFIG.width));
            }
            // Rightward segment.
            else {
                // Last segment, leave the last block for deceleration.
                if (i == this.segments.length - 1) {
                    this.leftEndFlagPos = this.leftEndFlagPos.add(new Vector3((this.segments[i] - 1) * Game.ROAD_CONFIG.width, 0, Game.ROAD_CONFIG.width));
                    this.rightEndFlagPos = this.rightEndFlagPos.add(new Vector3((this.segments[i] - 2) * Game.ROAD_CONFIG.width, 0, 0));
                    break;
                }
                this.leftEndFlagPos = this.leftEndFlagPos.add(new Vector3(this.segments[i] * Game.ROAD_CONFIG.width, 0, Game.ROAD_CONFIG.width));
                this.rightEndFlagPos = this.rightEndFlagPos.add(new Vector3((this.segments[i] - 1) * Game.ROAD_CONFIG.width, 0, 0));
            }
        }
    }

    /**
     * Generate the straight segments of the road.
     */
    generateSegments(): number[] {
        const segments = [];

        let currentLength = 1;
        let currentSegmentLength = 1;

        while (currentLength < this.length - 4) {
            const prob = this.roadCurveProbability(currentSegmentLength);

            if (Math.random() < prob) {
                // Road should curve
                segments.push(currentSegmentLength);
                currentSegmentLength = 1;
            } else {
                // Go straight
                currentSegmentLength++;
            }
            currentLength++;
        }

        segments.push(currentSegmentLength + 2)
        segments[0] += 2;

        return segments;
    }

    /**
     * Return true if the road contains the vector, otherwise false.
     */
    contains(vec: Vector3, roadWidth: number): boolean {
        let currentX = 0;
        let currentZ = 0;
        let directionIsRight = false;

        for (let segment of this.segments) {
            let zLength = roadWidth;
            let xLength = roadWidth;

            if (directionIsRight) {
                xLength = roadWidth * segment;
            } else {
                zLength = roadWidth * segment;
            }

            let minX = currentX * roadWidth;
            let maxX = minX + xLength;
            let minZ = currentZ * roadWidth;
            let maxZ = minZ + zLength;

            if (vec.x < minX || vec.z < minZ) {
                return false;
            } else if (vec.x <= maxX && vec.z <= maxZ) {
                return true;
            }

            if (directionIsRight) {
                currentX += segment;
            } else {
                currentZ += segment;
            }
            directionIsRight = !directionIsRight;
        }

        return false;
    }

    /**
     * Returns true if the car with given information finished the road.
     *
     * @param carDistForward - car travel distance in forward direction
     * @param carDistRightward - car travel distance in rightward direction
     *
     * @return true if car finished the road
     */
    isCarFinished(carDistForward: number, carDistRightward: number): boolean {
        if (this.isRoadEndForward) {
            return carDistForward >= this.goalDistance;
        } else {
            return carDistRightward >= this.goalDistance;
        }
    }
}