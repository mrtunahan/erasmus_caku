package com.takip.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import com.takip.model.Duyuru;
import com.takip.service.DuyuruService;

@Controller
public class PanelController {

    @Autowired
    private DuyuruService service;

    @GetMapping("/")
    public String anaSayfa(Model model) {
        List<Duyuru> veriler = service.getDuyurular();
        System.out.println("--> Çekilen veri sayısı: " + veriler.size());
        model.addAttribute("duyurular", veriler);
        return "index";
    }
}
