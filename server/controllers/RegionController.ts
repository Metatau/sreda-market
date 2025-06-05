import { Request, Response } from "express";
import { BaseController } from "./BaseController";
import { storage } from "../storage";
import { handleAsyncError, NotFoundError } from "../utils/errors";
import { validateId } from "../utils/validation";

export class RegionController extends BaseController {
  getRegions = handleAsyncError(async (req: Request, res: Response) => {
    const regions = await storage.getRegions();
    this.sendSuccess(res, regions);
  });

  getRegion = handleAsyncError(async (req: Request, res: Response) => {
    const id = validateId(req.params.id);
    const region = await storage.getRegion(id);
    
    if (!region) {
      throw new NotFoundError("Region");
    }

    this.sendSuccess(res, region);
  });

  getRegionAnalytics = handleAsyncError(async (req: Request, res: Response) => {
    const id = validateId(req.params.id);
    const analytics = await storage.getRegionAnalytics(id);
    this.sendSuccess(res, analytics);
  });
}